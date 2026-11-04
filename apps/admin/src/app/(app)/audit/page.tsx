import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, isNull, like, lte, or, sql } from "drizzle-orm";
import { accessibleProperties, can } from "@repo/auth";
import { auditLog, getDb, properties, staffMembers, user } from "@repo/db";
import { isDate } from "@repo/engine";
import { when } from "@/lib/format";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Audit log" };

const pageSize = 100;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Every action in plain words. Anything not listed shows its code. */
const actionLabel: Record<string, string> = {
  "auth.sign_in": "Signed in",
  "booking.create": "Made a booking",
  "booking.cancel": "Cancelled a booking",
  "booking.check_in": "Checked a guest in",
  "booking.check_out": "Checked a guest out",
  "booking.no_show": "Marked a no-show",
  "booking.price": "Set a booking's price",
  "booking.unit": "Moved a guest to another room",
  "booking.note": "Added a note to a booking",
  "payment.record": "Recorded a payment",
  "block.create": "Blocked rooms",
  "block.lift": "Lifted a block",
  "stay_rules.set": "Set stay rules",
  "stay_rules.clear": "Cleared stay rules",
  "date_rates.set": "Set prices for dates",
  "date_rates.clear": "Removed prices for dates",
  "rate.create": "Added a rate",
  "rate.update": "Changed a rate",
  "rate.delete": "Removed a rate",
  "season.create": "Added a season",
  "season.delete": "Removed a season",
  "age_band.create": "Added a child age band",
  "age_band.update": "Changed a child age band",
  "property.weekend_nights": "Changed the weekend nights",
  "property.settings": "Changed a resort's settings",
  "offering.create": "Added a package",
  "offering.update": "Changed a package",
  "offering.active": "Put a package on or off sale",
  "offering.duplicate": "Duplicated a package",
  "slot.create": "Added a time slot",
  "slot.update": "Changed a time slot",
  "capacity.set": "Set seats for days",
  "room_type.create": "Added a room type",
  "room_type.update": "Changed a room type",
  "room_type.status": "Put a room type on or off sale",
  "room_type.move": "Moved a room type in the list",
  "unit.create": "Added a room",
  "unit.status": "Changed a room's status",
  "staff.invite": "Added a staff member",
  "staff.deactivate": "Deactivated a staff member",
  "staff.reactivate": "Reactivated a staff member",
};

/** Kinds of change to filter by, each a set of action prefixes. */
const kinds = {
  bookings: { label: "Bookings and payments", prefixes: ["booking.", "payment."] },
  inventory: { label: "Blocks, stay rules and seats", prefixes: ["block.", "stay_rules.", "capacity."] },
  prices: { label: "Prices and packages", prefixes: ["rate.", "season.", "age_band.", "date_rates.", "property.weekend_nights", "offering.", "slot."] },
  rooms: { label: "Rooms", prefixes: ["room_type.", "unit."] },
  people: { label: "Staff and sign-ins", prefixes: ["staff.", "auth."] },
  settings: { label: "Settings", prefixes: ["property.settings"] },
} as const;

/** Fields that change on every save and say nothing. */
const quiet = new Set(["updatedAt", "createdAt"]);
const show = (value: unknown) => (value === null || value === undefined ? "empty" : typeof value === "object" ? JSON.stringify(value) : String(value));

/** What changed between the values before and after, field by field. */
function changes(before: unknown, after: unknown) {
  const was = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const now = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(was), ...Object.keys(now)])].filter((key) => !quiet.has(key));
  return keys
    .filter((key) => JSON.stringify(was[key]) !== JSON.stringify(now[key]))
    .map((key) => ({ key, before: key in was ? show(was[key]) : null, after: key in now ? show(now[key]) : null }));
}

/** Who changed what, when, from where, and the values before and after (USR-05). */
export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const staff = await requireStaffPage();
  if (!can(staff, "audit.view")) {
    return (
      <div className="card p-6">
        <h1 className="text-[1.2rem] font-semibold">Not open to your role</h1>
        <p className="mt-1 text-muted">Only a Super Admin and Accounts can see the audit log.</p>
      </div>
    );
  }
  const db = getDb();
  const resorts = (await accessibleProperties(db, staff)).filter((r) => can(staff, "audit.view", r.id));
  const query = await searchParams;
  const resort = resorts.find((r) => r.code === one(query.resort)?.toUpperCase());
  const groupOnly = one(query.resort) === "group" && staff.allProperties;
  const person = one(query.person);
  const kind = one(query.kind) as keyof typeof kinds | undefined;
  const from = isDate(one(query.from)) ? one(query.from) : undefined;
  const to = isDate(one(query.to)) ? one(query.to) : undefined;
  const page = Math.max(1, Number(one(query.page)) || 1);

  // Someone with every resort also sees group-wide entries, such as sign-ins and staff changes.
  const scope = resort
    ? eq(auditLog.propertyId, resort.id)
    : groupOnly
      ? isNull(auditLog.propertyId)
      : staff.allProperties
        ? undefined
        : resorts.length
          ? inArray(auditLog.propertyId, resorts.map((r) => r.id))
          : sql`false`;
  const day = sql<string>`(${auditLog.at} at time zone 'Asia/Kolkata')::date`;
  const where = and(
    scope,
    person ? eq(auditLog.userId, person) : undefined,
    kind && kind in kinds ? or(...kinds[kind].prefixes.map((prefix) => like(auditLog.action, `${prefix}%`))) : undefined,
    from ? gte(day, from) : undefined,
    to ? lte(day, to) : undefined,
  );

  const rows = await db
    .select({ entry: auditLog, by: user.name, code: properties.code })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.userId))
    .leftJoin(properties, eq(properties.id, auditLog.propertyId))
    .where(where)
    .orderBy(desc(auditLog.at), desc(auditLog.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  const more = rows.length > pageSize;
  const people = await db.select({ id: user.id, name: user.name }).from(staffMembers).innerJoin(user, eq(user.id, staffMembers.userId)).orderBy(asc(user.name));
  const link = (changesTo: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ resort: one(query.resort), person, kind, from, to, page, ...changesTo })) if (value !== undefined && value !== "" && !(key === "page" && value === 1)) params.set(key, String(value));
    const text = params.toString();
    return text ? `/audit?${text}` : "/audit";
  };

  return (
    <div>
      <h1 className="text-[1.35rem] font-semibold">Audit log</h1>
      <p className="mt-1 text-muted">Every change and sign-in: who, when, from which address, and the values before and after.</p>

      <form className="card mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className="label" htmlFor="audit-resort">
            Resort
          </label>
          <select id="audit-resort" name="resort" defaultValue={one(query.resort) ?? ""} className="field">
            <option value="">{staff.allProperties ? "Everything" : "My resorts"}</option>
            {resorts.map((r) => (
              <option key={r.id} value={r.code.toLowerCase()}>
                {r.name}
              </option>
            ))}
            {staff.allProperties && <option value="group">Group-wide only</option>}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="audit-person">
            Person
          </label>
          <select id="audit-person" name="person" defaultValue={person ?? ""} className="field">
            <option value="">Anyone</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="audit-kind">
            Kind of change
          </label>
          <select id="audit-kind" name="kind" defaultValue={kind ?? ""} className="field">
            <option value="">All</option>
            {Object.entries(kinds).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="audit-from">
            From
          </label>
          <input id="audit-from" name="from" type="date" defaultValue={from} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="audit-to">
            To
          </label>
          <input id="audit-to" name="to" type="date" defaultValue={to} className="field" />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="button">
            Show
          </button>
          <Link href="/audit" className="button-quiet">
            Clear
          </Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 text-muted">Nothing matches.</p>
      ) : (
        <ol className="card mt-4 divide-y divide-line">
          {rows.slice(0, pageSize).map(({ entry, by, code }) => {
            const changed = changes(entry.before, entry.after);
            return (
              <li key={entry.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p>
                    <span className="font-medium">{by ?? "The system"}</span> <span>{(actionLabel[entry.action] ?? entry.action).replace(/^./, (c) => c.toLowerCase())}</span>
                    {code && <span className="text-muted"> · {code}</span>}
                  </p>
                  <p className="text-[0.82rem] text-muted">
                    {when(entry.at)}
                    {entry.ip ? ` · ${entry.ip}` : ""}
                  </p>
                </div>
                <p className="text-[0.8rem] text-muted">
                  {entry.entity}
                  {entry.entityId ? ` ${entry.entityId}` : ""}
                </p>
                {changed.length > 0 && (
                  <details className="mt-1 text-[0.85rem]">
                    <summary className="cursor-pointer text-muted">
                      What changed ({changed.length} {changed.length === 1 ? "field" : "fields"})
                    </summary>
                    <table className="mt-1 w-full table-fixed text-left">
                      <thead className="text-[0.75rem] text-muted">
                        <tr>
                          <th className="w-1/5 py-1 pr-2 font-semibold">Field</th>
                          <th className="py-1 pr-2 font-semibold">Before</th>
                          <th className="py-1 font-semibold">After</th>
                        </tr>
                      </thead>
                      <tbody className="align-top">
                        {changed.map((change) => (
                          <tr key={change.key} className="border-t border-line">
                            <td className="py-1 pr-2 font-medium break-words">{change.key}</td>
                            <td className="py-1 pr-2 break-words text-muted">{change.before ?? "—"}</td>
                            <td className="py-1 break-words">{change.after ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {(page > 1 || more) && (
        <nav aria-label="Pages" className="mt-4 flex gap-2">
          {page > 1 && (
            <Link href={link({ page: page - 1 })} className="button-quiet">
              Newer
            </Link>
          )}
          {more && (
            <Link href={link({ page: page + 1 })} className="button-quiet">
              Older
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

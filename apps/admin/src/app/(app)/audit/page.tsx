import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, isNull, like, lte, or, sql } from "drizzle-orm";
import { accessibleProperties, can } from "@repo/auth";
import { auditLog, getDb, properties, staffMembers, user } from "@repo/db";
import { isDate } from "@repo/engine";
import { BedDouble, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Inbox, IndianRupee, Lock, LogIn, ScrollText, Settings, Tag, Ticket, Users, type LucideIcon } from "lucide-react";
import { properties as sites } from "@repo/sites";
import { DateField } from "@/components/date-field";
import { PageHeader } from "@/components/page-header";
import { ResortMark } from "@/components/resort-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clock, longDate } from "@/lib/format";
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
  "website.refresh": "Refreshed a resort's website",
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
  "lead.create": "Added a lead",
  "lead.status": "Changed a lead's status",
  "lead.assign": "Handed a lead to someone",
  "lead.follow_up": "Set a lead's follow-up day",
  "lead.note": "Added a note to a lead",
  "lead.booked": "Booked a lead",
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
  leads: { label: "Leads", prefixes: ["lead."] },
  people: { label: "Staff and sign-ins", prefixes: ["staff.", "auth."] },
  settings: { label: "Settings and websites", prefixes: ["property.settings", "website."] },
} as const;

/** An icon for each kind of change, so the log can be scanned by eye. */
const iconFor = (action: string): LucideIcon =>
  action.startsWith("booking.")
    ? ClipboardList
    : action.startsWith("payment.")
      ? IndianRupee
      : action.startsWith("block.") || action.startsWith("stay_rules.") || action.startsWith("capacity.")
        ? CalendarDays
        : action.startsWith("offering.") || action.startsWith("slot.")
          ? Ticket
          : action.startsWith("rate.") || action.startsWith("season.") || action.startsWith("age_band.") || action.startsWith("date_rates.") || action === "property.weekend_nights"
            ? Tag
            : action.startsWith("room_type.") || action.startsWith("unit.")
              ? BedDouble
              : action.startsWith("staff.")
                ? Users
                : action.startsWith("lead.")
                  ? Inbox
                : action.startsWith("auth.")
                  ? LogIn
                  : action === "property.settings" || action.startsWith("website.")
                    ? Settings
                    : ScrollText;

/** Entries in runs by their day in India, newest first: Today, Yesterday, then dates. */
function days<T extends { entry: { at: Date } }>(entries: T[]) {
  const key = (at: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(at);
  const today = key(new Date());
  const yesterday = key(new Date(Date.now() - 86_400_000));
  const groups: { label: string; entries: T[] }[] = [];
  for (const item of entries) {
    const day = key(item.entry.at);
    const label = day === today ? "Today" : day === yesterday ? "Yesterday" : longDate(day);
    if (groups.at(-1)?.label === label) groups.at(-1)!.entries.push(item);
    else groups.push({ label, entries: [item] });
  }
  return groups;
}

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
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lock />
          </EmptyMedia>
          <EmptyTitle>Not open to your role</EmptyTitle>
          <EmptyDescription>Only a Super Admin and Accounts can see the audit log.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  const db = getDb();
  const resorts = (await accessibleProperties(db, staff)).filter((r) => can(staff, "audit.view", r.id));
  const query = await searchParams;
  const resort = resorts.find((r) => r.code === one(query.resort)?.toUpperCase());
  const groupOnly = one(query.resort) === "group" && staff.allProperties;
  const person = one(query.person) && one(query.person) !== "all" ? one(query.person) : undefined;
  const kind = one(query.kind) && one(query.kind) !== "all" ? (one(query.kind) as keyof typeof kinds) : undefined;
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
    for (const [key, value] of Object.entries({ resort: one(query.resort) === "all" ? undefined : one(query.resort), person, kind, from, to, page, ...changesTo })) if (value !== undefined && value !== "" && !(key === "page" && value === 1)) params.set(key, String(value));
    const text = params.toString();
    return text ? `/audit?${text}` : "/audit";
  };

  return (
    <>
      <PageHeader title="Audit log" description="Every change and sign-in: who, when, from which address, and the values before and after (USR-05)." />

      <Card className="gap-0 py-0 shadow-xs">
        <form className="grid gap-2 bg-muted/30 p-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
          <Select name="resort" defaultValue={one(query.resort) ?? "all"}>
            <SelectTrigger aria-label="Resort" className="w-full bg-background lg:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{staff.allProperties ? "Everywhere" : "My resorts"}</SelectItem>
              {resorts.map((r) => (
                <SelectItem key={r.id} value={r.code.toLowerCase()}>
                  {r.name}
                </SelectItem>
              ))}
              {staff.allProperties && <SelectItem value="group">Group-wide only</SelectItem>}
            </SelectContent>
          </Select>
          <Select name="person" defaultValue={person ?? "all"}>
            <SelectTrigger aria-label="Person" className="w-full bg-background lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="kind" defaultValue={kind ?? "all"}>
            <SelectTrigger aria-label="Kind of change" className="w-full bg-background lg:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Every kind of change</SelectItem>
              {Object.entries(kinds).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="lg:w-40">
            <DateField id="audit-from" name="from" defaultValue={from} placeholder="From any day" className="bg-background" />
          </div>
          <div className="lg:w-40">
            <DateField id="audit-to" name="to" defaultValue={to} placeholder="To any day" className="bg-background" />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:ml-auto">
            <Button type="submit">Show</Button>
            <Button variant="ghost" asChild>
              <Link href="/audit">Clear</Link>
            </Button>
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollText />
            </EmptyMedia>
            <EmptyTitle>Nothing matches</EmptyTitle>
            <EmptyDescription>Try another person, kind of change or dates.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="gap-0 py-0 shadow-xs">
          {days(rows.slice(0, pageSize)).map(({ label, entries }, index) => (
            <section key={label} aria-label={label}>
              <h2 className={`sticky top-14 z-10 border-b bg-muted/80 px-6 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur ${index === 0 ? "rounded-t-xl" : "border-t"}`}>{label}</h2>
              <ol className="divide-y">
                {entries.map(({ entry, by, code }) => {
                  const changed = changes(entry.before, entry.after);
                  const Icon = iconFor(entry.action);
                  const site = sites.find((s) => s.code === code);
                  return (
                    <li key={entry.id} className="flex gap-4 px-6 py-4">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary ring-1 ring-primary/10 ring-inset">
                        <Icon className="size-4" />
                      </span>
                      <div className="grid min-w-0 flex-1 gap-1.5">
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                          <p className="text-sm">
                            <span className="font-medium">{by ?? "The system"}</span> {(actionLabel[entry.action] ?? entry.action).replace(/^./, (c) => c.toLowerCase())}
                          </p>
                          <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{clock(entry.at)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {code ? (
                            <span className="flex items-center gap-1.5 rounded-md border bg-background py-0.5 pr-2 pl-0.5">
                              <ResortMark code={code} className="size-4 rounded-sm" />
                              {site?.shortName ?? code}
                            </span>
                          ) : (
                            <span className="rounded-md border bg-background px-2 py-0.5">Group-wide</span>
                          )}
                          {entry.ip && <span className="tabular-nums">from {entry.ip}</span>}
                        </div>
                        {(changed.length > 0 || entry.entityId) && (
                          <Collapsible>
                            <CollapsibleTrigger className="group/more flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                              <ChevronDown className="size-4 transition-transform group-data-[state=open]/more:rotate-180" />
                              {changed.length > 0 ? `What changed (${changed.length} ${changed.length === 1 ? "field" : "fields"})` : "Details"}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 grid gap-2">
                              <p className="font-mono text-xs text-muted-foreground">
                                {entry.entity}
                                {entry.entityId ? ` ${entry.entityId}` : ""}
                              </p>
                              {changed.length > 0 && (
                                <div className="overflow-hidden rounded-lg border">
                                  <Table className="table-fixed">
                                    <TableHeader className="bg-muted/40">
                                      <TableRow>
                                        <TableHead className="w-1/5">Field</TableHead>
                                        <TableHead>Before</TableHead>
                                        <TableHead>After</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {changed.map((change) => (
                                        <TableRow key={change.key} className="align-top">
                                          <TableCell className="font-medium break-words whitespace-normal">{change.key}</TableCell>
                                          <TableCell className="break-words whitespace-normal text-muted-foreground">{change.before ?? "—"}</TableCell>
                                          <TableCell className="break-words whitespace-normal">{change.after ?? "—"}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {(page > 1 || more) && (
            <div className="flex gap-2 border-t px-6 py-3">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={link({ page: page - 1 })}>
                    <ChevronLeft />
                    Newer
                  </Link>
                </Button>
              )}
              {more && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={link({ page: page + 1 })}>
                    Older
                    <ChevronRight />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </Card>
      )}
    </>
  );
}

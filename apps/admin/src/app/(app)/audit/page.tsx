import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, isNull, like, lte, or, sql } from "drizzle-orm";
import { accessibleProperties, can } from "@repo/auth";
import { auditLog, getDb, properties, staffMembers, user } from "@repo/db";
import { isDate } from "@repo/engine";
import { ChevronDown, ChevronLeft, ChevronRight, Lock, ScrollText } from "lucide-react";
import { DateField } from "@/components/date-field";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

      <Card className="py-4">
        <CardContent className="px-4">
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
            <Field>
              <FieldLabel htmlFor="audit-resort">Resort</FieldLabel>
              <Select name="resort" defaultValue={one(query.resort) ?? "all"}>
                <SelectTrigger id="audit-resort" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{staff.allProperties ? "Everything" : "My resorts"}</SelectItem>
                  {resorts.map((r) => (
                    <SelectItem key={r.id} value={r.code.toLowerCase()}>
                      {r.name}
                    </SelectItem>
                  ))}
                  {staff.allProperties && <SelectItem value="group">Group-wide only</SelectItem>}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="audit-person">Person</FieldLabel>
              <Select name="person" defaultValue={person ?? "all"}>
                <SelectTrigger id="audit-person" className="w-full">
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
            </Field>
            <Field>
              <FieldLabel htmlFor="audit-kind">Kind of change</FieldLabel>
              <Select name="kind" defaultValue={kind ?? "all"}>
                <SelectTrigger id="audit-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Object.entries(kinds).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="audit-from">From</FieldLabel>
              <DateField id="audit-from" name="from" defaultValue={from} placeholder="Any day" />
            </Field>
            <Field>
              <FieldLabel htmlFor="audit-to">To</FieldLabel>
              <DateField id="audit-to" name="to" defaultValue={to} placeholder="Any day" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit">Show</Button>
              <Button variant="ghost" asChild>
                <Link href="/audit">Clear</Link>
              </Button>
            </div>
          </form>
        </CardContent>
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
        <Card className="gap-0 py-0">
          <ol className="divide-y">
            {rows.slice(0, pageSize).map(({ entry, by, code }) => {
              const changed = changes(entry.before, entry.after);
              return (
                <li key={entry.id} className="grid gap-1.5 px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-muted text-xs font-semibold">{(by ?? "S").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm">
                        <span className="font-medium">{by ?? "The system"}</span> {(actionLabel[entry.action] ?? entry.action).replace(/^./, (c) => c.toLowerCase())}
                        {code && (
                          <Badge variant="outline" className="ml-2 align-middle">
                            {code}
                          </Badge>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {when(entry.at)}
                      {entry.ip ? ` · ${entry.ip}` : ""}
                    </p>
                  </div>
                  <p className="pl-11 font-mono text-xs text-muted-foreground">
                    {entry.entity}
                    {entry.entityId ? ` ${entry.entityId}` : ""}
                  </p>
                  {changed.length > 0 && (
                    <Collapsible className="pl-11">
                      <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ChevronDown className="size-4" />
                        What changed ({changed.length} {changed.length === 1 ? "field" : "fields"})
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <Table className="table-fixed">
                          <TableHeader>
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
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </li>
              );
            })}
          </ol>
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

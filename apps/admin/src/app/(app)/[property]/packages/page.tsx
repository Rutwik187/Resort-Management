import { asc, eq, inArray } from "drizzle-orm";
import { Ticket } from "lucide-react";
import { can } from "@repo/auth";
import { ageBands, getDb, offeringChildPrices, offerings, offeringSlots } from "@repo/db";
import { dayOfWeek, todayInIndia } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { longDate, rupees, shortDate } from "@/lib/format";
import { seatsAhead } from "@/lib/seats";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { OfferingButtons, OfferingDialog, SeatsDialog, SlotsDialog } from "./forms";

export const metadata = { title: "Packages" };

const kindLabel = { day_package: "Day packages", activity: "Activities", dining: "Meal sittings", other: "Other tickets" } as const;
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hhmm = (time: string | null) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

/**
 * What a resort sells by the day and counts in guests (INV-09): day
 * packages, activities and meal sittings, each with time slots, the usual
 * seats a day, and seats set for chosen days.
 */
export default async function PackagesPage({ params }: PageProps<"/[property]/packages">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "prices.view", property.id)) return <NoAccess what="packages" />;
  const manage = can(staff, "prices.manage", property.id);
  const seatsManage = can(staff, "inventory.manage", property.id);
  const db = getDb();

  const list = await db.select().from(offerings).where(eq(offerings.propertyId, property.id)).orderBy(asc(offerings.sortOrder), asc(offerings.name));
  const ids = list.map((o) => o.id);
  const slots = ids.length ? await db.select().from(offeringSlots).where(inArray(offeringSlots.offeringId, ids)).orderBy(asc(offeringSlots.sortOrder), asc(offeringSlots.label)) : [];
  const children = ids.length ? await db.select().from(offeringChildPrices).where(inArray(offeringChildPrices.offeringId, ids)) : [];
  const bands = (await db.select().from(ageBands).where(eq(ageBands.propertyId, property.id)).orderBy(asc(ageBands.sortOrder))).filter((b) => !b.free);
  const today = todayInIndia();
  const seats = await seatsAhead(property.id, today, 7);
  const kinds = (Object.keys(kindLabel) as (keyof typeof kindLabel)[]).filter((kind) => list.some((o) => o.kind === kind));
  const paidBands = bands.map(({ id, label }) => ({ id, label }));

  const onSale = list.filter((o) => o.active).length;

  return (
    <>
      <PageHeader
        title="Packages"
        description="Day packages, activities and meal sittings are sold by the day and counted in guests. Each has time slots, and each slot a number of seats a day. When a day's seats are taken, it shows as full on the website and here."
        actions={manage && <OfferingDialog propertyId={property.id} bands={paidBands} />}
      />

      {list.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Ticket />
            </EmptyMedia>
            <EmptyTitle>Nothing yet</EmptyTitle>
            <EmptyDescription>Add a day package, an activity or a meal sitting.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground tabular-nums">{onSale}</span> of {list.length} on sale
          </span>
          <span aria-hidden="true" className="hidden h-4 w-px bg-border sm:block" />
          <span>Seats left for the next 7 days:</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 min-w-7 items-center justify-center rounded bg-warn/10 px-1 text-xs font-medium text-warn tabular-nums">4</span> few left
          </span>
          <span className="flex items-center gap-1.5">
            <Badge variant="outline" className="border-danger/30 bg-danger/10 px-1.5 py-0 text-danger">
              Full
            </Badge>
          </span>
          <span>– not sold that day</span>
          <span>• seats set for that day</span>
        </div>
      )}

      {kinds.map((kind) => (
        <section key={kind} className="grid gap-4" aria-labelledby={`${kind}-heading`}>
          <h2 id={`${kind}-heading`} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            {kindLabel[kind]}
            <span className="rounded-full bg-foreground/[0.06] px-2 text-xs font-medium text-muted-foreground tabular-nums">{list.filter((o) => o.kind === kind).length}</span>
          </h2>
          {list
            .filter((o) => o.kind === kind)
            .map((offering) => {
              const own = slots.filter((s) => s.offeringId === offering.id);
              const childPaise = Object.fromEntries(children.filter((c) => c.offeringId === offering.id).map((c) => [c.ageBandId, c.paise]));
              return (
                <Card key={offering.id} className={`gap-0 overflow-hidden py-0 shadow-xs ${offering.active ? "" : "bg-muted/30"}`}>
                  <CardHeader className="border-b py-4 [.border-b]:pb-4">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {offering.name}
                      {!offering.active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Off sale
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="grid gap-2">
                      {offering.summary && <span>{offering.summary}</span>}
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Adult {rupees(offering.adultPaise)}</Badge>
                        {bands.map((band) => (
                          <Badge key={band.id} variant="outline" className="font-normal">
                            {band.label} {childPaise[band.id] === undefined ? "not published" : rupees(childPaise[band.id])}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="font-normal">
                          {offering.soldOn?.length ? offering.soldOn.map((d) => weekdays[d]).join(", ") : "Every day"}
                        </Badge>
                        {(offering.validFrom || offering.validTo) && (
                          <Badge variant="outline" className="font-normal">
                            {offering.validFrom ? `From ${longDate(offering.validFrom)}` : ""}
                            {offering.validFrom && offering.validTo ? " " : ""}
                            {offering.validTo ? `until ${longDate(offering.validTo)}` : ""}
                          </Badge>
                        )}
                      </span>
                    </CardDescription>
                    {manage && (
                      <CardAction className="flex flex-wrap gap-1.5 sm:justify-end">
                        <OfferingDialog
                          propertyId={property.id}
                          bands={paidBands}
                          offering={{
                            id: offering.id,
                            kind: offering.kind,
                            code: offering.code,
                            name: offering.name,
                            summary: offering.summary,
                            adultPaise: offering.adultPaise,
                            soldOn: offering.soldOn,
                            validFrom: offering.validFrom,
                            validTo: offering.validTo,
                            children: childPaise,
                          }}
                        />
                        <SlotsDialog offeringId={offering.id} name={offering.name} slots={own.map((s) => ({ id: s.id, label: s.label, startsAt: s.startsAt, endsAt: s.endsAt, defaultCapacity: s.defaultCapacity, active: s.active }))} />
                        <OfferingButtons offeringId={offering.id} active={offering.active} />
                      </CardAction>
                    )}
                  </CardHeader>
                  <CardContent className="px-0">
                    {own.length === 0 ? (
                      <p className="px-6 py-4 text-sm text-muted-foreground">No time slots yet. Add one under Time slots to sell seats.</p>
                    ) : !offering.active ? (
                      <ul className="divide-y">
                        {own.map((slot) => (
                          <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-sm">
                            <span>
                              <span className="font-medium">{slot.label}</span>
                              <span className="text-muted-foreground"> · {slot.defaultCapacity} seats a day usually</span>
                            </span>
                            {seatsManage && <SeatsDialog slotId={slot.id} label={slot.label} first={today} />}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="pl-6">Slot</TableHead>
                            {seats.days.map((day) => (
                              <TableHead key={day} className={`text-center ${day === today ? "text-primary" : ""}`}>
                                {day === today ? "Today" : shortDate(day).replace(",", "")}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {own.map((slot) => (
                            <TableRow key={slot.id} className="hover:bg-transparent">
                              <TableCell className="pl-6 whitespace-normal">
                                <span className="font-medium">{slot.label}</span>
                                {slot.startsAt && !slot.label.includes(hhmm(slot.startsAt)) && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {hhmm(slot.startsAt)}
                                    {slot.endsAt ? ` to ${hhmm(slot.endsAt)}` : ""}
                                  </span>
                                )}
                                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {slot.defaultCapacity === 0 ? <span className="text-warn">No seats a day yet: set them under Time slots</span> : `${slot.defaultCapacity} seats a day usually`}
                                  {slot.active ? "" : " · off sale"}
                                  {seatsManage && <SeatsDialog slotId={slot.id} label={slot.label} first={today} />}
                                </span>
                              </TableCell>
                              {seats.days.map((day) => {
                                const s = seats.on(slot.id, slot.defaultCapacity, day);
                                const sold = slot.active && (!offering.soldOn?.length || offering.soldOn.includes(dayOfWeek(day))) && (!offering.validFrom || day >= offering.validFrom) && (!offering.validTo || day <= offering.validTo);
                                if (!sold || s.capacity === 0) {
                                  return (
                                    <TableCell key={day} title={!sold ? "Not sold that day" : "No seats on sale"} className="text-center text-muted-foreground/70">
                                      –
                                    </TableCell>
                                  );
                                }
                                const few = s.left > 0 && s.left <= Math.max(2, Math.ceil(s.capacity * 0.2));
                                return (
                                  <TableCell key={day} title={`${s.sold} sold, ${s.held} held, of ${s.capacity}${s.own ? " (set for this day)" : ""}`} className="text-center tabular-nums">
                                    {s.left === 0 ? (
                                      <Badge variant="outline" className="border-danger/30 bg-danger/10 text-danger">
                                        Full
                                      </Badge>
                                    ) : (
                                      <span className={`inline-flex h-6 min-w-8 items-center justify-center rounded px-1.5 font-medium ${few ? "bg-warn/10 text-warn" : ""}`}>{s.left}</span>
                                    )}
                                    {s.own && <span className="text-muted-foreground"> •</span>}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </section>
      ))}
    </>
  );
}

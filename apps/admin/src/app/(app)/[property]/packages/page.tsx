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

  return (
    <>
      <PageHeader
        title="Packages"
        description="Day packages, activities and meal sittings are sold by the day and counted in guests. Each has time slots, and each slot a number of seats a day. When a day's seats are taken, it shows as full on the website and here."
        actions={manage && <OfferingDialog propertyId={property.id} bands={paidBands} />}
      />

      {list.length === 0 && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Ticket />
            </EmptyMedia>
            <EmptyTitle>Nothing yet</EmptyTitle>
            <EmptyDescription>Add a day package, an activity or a meal sitting.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {kinds.map((kind) => (
        <section key={kind} className="grid gap-4" aria-labelledby={`${kind}-heading`}>
          <h2 id={`${kind}-heading`} className="text-lg font-semibold tracking-tight">
            {kindLabel[kind]}
          </h2>
          {list
            .filter((o) => o.kind === kind)
            .map((offering) => {
              const own = slots.filter((s) => s.offeringId === offering.id);
              const childPaise = Object.fromEntries(children.filter((c) => c.offeringId === offering.id).map((c) => [c.ageBandId, c.paise]));
              return (
                <Card key={offering.id} className={offering.active ? undefined : "opacity-75"}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {offering.name}
                      {!offering.active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Off sale
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="grid gap-2">
                      {offering.summary && <span className="text-foreground">{offering.summary}</span>}
                      <span className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary">Adult {rupees(offering.adultPaise)}</Badge>
                        {bands.map((band) => (
                          <Badge key={band.id} variant="outline">
                            {band.label} {childPaise[band.id] === undefined ? "not published" : rupees(childPaise[band.id])}
                          </Badge>
                        ))}
                        <Badge variant="outline">{offering.soldOn?.length ? offering.soldOn.map((d) => weekdays[d]).join(", ") : "Every day"}</Badge>
                        {(offering.validFrom || offering.validTo) && (
                          <Badge variant="outline">
                            {offering.validFrom ? `From ${longDate(offering.validFrom)}` : ""}
                            {offering.validFrom && offering.validTo ? " " : ""}
                            {offering.validTo ? `until ${longDate(offering.validTo)}` : ""}
                          </Badge>
                        )}
                      </span>
                    </CardDescription>
                    {manage && (
                      <CardAction className="flex flex-wrap justify-end gap-2">
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
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Slot: seats left</TableHead>
                          {seats.days.map((day) => (
                            <TableHead key={day} className="text-center">
                              {day === today ? "Today" : shortDate(day).replace(",", "")}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {own.map((slot) => (
                          <TableRow key={slot.id}>
                            <TableCell className="whitespace-normal">
                              <span className="font-medium">{slot.label}</span>
                              {slot.startsAt && !slot.label.includes(hhmm(slot.startsAt)) && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {hhmm(slot.startsAt)}
                                  {slot.endsAt ? ` to ${hhmm(slot.endsAt)}` : ""}
                                </span>
                              )}
                              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {slot.defaultCapacity} seats a day usually{slot.active ? "" : " · off sale"}
                                {seatsManage && <SeatsDialog slotId={slot.id} label={slot.label} first={today} />}
                              </span>
                            </TableCell>
                            {seats.days.map((day) => {
                              const s = seats.on(slot.id, slot.defaultCapacity, day);
                              const sold = offering.active && slot.active && (!offering.soldOn?.length || offering.soldOn.includes(dayOfWeek(day))) && (!offering.validFrom || day >= offering.validFrom) && (!offering.validTo || day <= offering.validTo);
                              if (!sold || s.capacity === 0) {
                                return (
                                  <TableCell key={day} title={!sold ? "Not sold that day" : "No seats on sale"} className="text-center text-muted-foreground">
                                    –
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={day} title={`${s.sold} sold, ${s.held} held, of ${s.capacity}${s.own ? " (set for this day)" : ""}`} className="text-center tabular-nums">
                                  {s.left === 0 ? (
                                    <Badge variant="outline" className="border-danger/30 bg-danger/10 text-danger">
                                      Full
                                    </Badge>
                                  ) : (
                                    s.left
                                  )}
                                  {s.own && <span className="text-muted-foreground"> •</span>}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="mt-2 text-xs text-muted-foreground">– not on sale that day · • seats set for that day</p>
                  </CardContent>
                </Card>
              );
            })}
        </section>
      ))}
    </>
  );
}

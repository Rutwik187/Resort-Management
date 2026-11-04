import { asc, eq, inArray } from "drizzle-orm";
import { can } from "@repo/auth";
import { ageBands, getDb, offeringChildPrices, offerings, offeringSlots } from "@repo/db";
import { dayOfWeek, todayInIndia } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { longDate, rupees, shortDate } from "@/lib/format";
import { seatsAhead } from "@/lib/seats";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { OfferingButtons, OfferingForm, SeatsForm, SlotForm } from "./forms";

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

  return (
    <div>
      <h1 className="text-[1.35rem] font-semibold">Packages</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        Day packages, activities and meal sittings are sold by the day and counted in guests. Each has one or more time slots, and each slot a number of seats a day. When a day&apos;s seats are taken, it shows as full on the website and
        here.
      </p>

      {manage && (
        <details className="card mt-6 p-5">
          <summary className="cursor-pointer font-semibold">Add a package, activity or meal sitting</summary>
          <div className="mt-4">
            <OfferingForm propertyId={property.id} bands={bands.map(({ id, label }) => ({ id, label }))} />
          </div>
        </details>
      )}

      {list.length === 0 && <p className="mt-6 text-muted-foreground">Nothing yet.</p>}
      {kinds.map((kind) => (
        <section key={kind} className="mt-8" aria-labelledby={`${kind}-heading`}>
          <h2 id={`${kind}-heading`} className="text-[1.15rem] font-semibold">
            {kindLabel[kind]}
          </h2>
          <ul className="mt-3 grid gap-4">
            {list
              .filter((o) => o.kind === kind)
              .map((offering) => {
                const own = slots.filter((s) => s.offeringId === offering.id);
                const childPaise = Object.fromEntries(children.filter((c) => c.offeringId === offering.id).map((c) => [c.ageBandId, c.paise]));
                return (
                  <li key={offering.id} className={`card p-5 ${offering.active ? "" : "opacity-75"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          {offering.name}
                          {!offering.active && <span className="ml-2 rounded-full bg-foreground/5 px-2 py-0.5 text-[0.75rem] font-medium text-muted-foreground">Off sale</span>}
                        </h3>
                        {offering.summary && <p className="mt-0.5 text-[0.9rem]">{offering.summary}</p>}
                        <p className="mt-1 text-[0.86rem] text-muted-foreground">
                          Adult {rupees(offering.adultPaise)}
                          {bands.map((band) => ` · ${band.label} ${childPaise[band.id] === undefined ? "not published" : rupees(childPaise[band.id])}`).join("")}
                          {" · "}
                          {offering.soldOn?.length ? offering.soldOn.map((d) => weekdays[d]).join(", ") : "every day"}
                          {offering.validFrom || offering.validTo ? ` · ${offering.validFrom ? `from ${longDate(offering.validFrom)}` : ""}${offering.validFrom && offering.validTo ? " " : ""}${offering.validTo ? `until ${longDate(offering.validTo)}` : ""}` : ""}
                        </p>
                      </div>
                      {manage && <OfferingButtons offeringId={offering.id} active={offering.active} />}
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[40rem] text-left text-[0.85rem]">
                        <caption className="mb-1.5 text-left text-[0.78rem] font-semibold text-muted-foreground">Seats left, next 7 days</caption>
                        <thead className="text-[0.75rem] text-muted-foreground">
                          <tr className="border-b border-border">
                            <th className="py-1.5 pr-3 font-semibold">Slot</th>
                            {seats.days.map((day) => (
                              <th key={day} className="px-1 py-1.5 text-center font-normal">
                                {day === today ? "Today" : shortDate(day).replace(",", "")}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {own.map((slot) => (
                            <tr key={slot.id} className="border-b border-border last:border-0">
                              <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                                <span className="font-medium">{slot.label}</span>
                                {slot.startsAt && !slot.label.includes(hhmm(slot.startsAt)) && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {hhmm(slot.startsAt)}
                                    {slot.endsAt ? ` to ${hhmm(slot.endsAt)}` : ""}
                                  </span>
                                )}
                                <span className="block text-[0.75rem] text-muted-foreground">
                                  {slot.defaultCapacity} seats a day usually{slot.active ? "" : " · off sale"}
                                </span>
                              </th>
                              {seats.days.map((day) => {
                                const s = seats.on(slot.id, slot.defaultCapacity, day);
                                const sold = offering.active && slot.active && (!offering.soldOn?.length || offering.soldOn.includes(dayOfWeek(day))) && (!offering.validFrom || day >= offering.validFrom) && (!offering.validTo || day <= offering.validTo);
                                if (!sold) {
                                  return (
                                    <td key={day} title="Not sold that day" className="px-1 py-1.5 text-center text-muted-foreground">
                                      –
                                    </td>
                                  );
                                }
                                return (
                                  <td key={day} title={`${s.sold} sold, ${s.held} held, of ${s.capacity}${s.own ? " (set for this day)" : ""}`} className={`px-1 py-1.5 text-center ${s.left === 0 ? "font-semibold text-danger" : ""}`}>
                                    {s.capacity === 0 ? <span className="text-muted-foreground">–</span> : s.left === 0 ? "Full" : s.left}
                                    {s.own && <span className="text-muted-foreground"> •</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-1 text-[0.75rem] text-muted-foreground">– not on sale that day · • seats set for that day</p>
                    </div>

                    {(manage || seatsManage) && (
                      <div className="mt-4 grid gap-3 border-t border-border pt-3">
                        {seatsManage &&
                          own.map((slot) => (
                            <details key={slot.id}>
                              <summary className="cursor-pointer text-[0.9rem] font-semibold">Seats for chosen days: {slot.label}</summary>
                              <div className="mt-2">
                                <SeatsForm slotId={slot.id} first={today} />
                              </div>
                            </details>
                          ))}
                        {manage && (
                          <details>
                            <summary className="cursor-pointer text-[0.9rem] font-semibold">Change the slots</summary>
                            <div className="mt-2 grid gap-3">
                              {own.map((slot) => (
                                <SlotForm key={slot.id} offeringId={offering.id} slot={{ id: slot.id, label: slot.label, startsAt: slot.startsAt, endsAt: slot.endsAt, defaultCapacity: slot.defaultCapacity, active: slot.active }} />
                              ))}
                              <SlotForm offeringId={offering.id} />
                            </div>
                          </details>
                        )}
                        {manage && (
                          <details>
                            <summary className="cursor-pointer text-[0.9rem] font-semibold">Change {offering.name}</summary>
                            <div className="mt-2">
                              <OfferingForm
                                propertyId={property.id}
                                bands={bands.map(({ id, label }) => ({ id, label }))}
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
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

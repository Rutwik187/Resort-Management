import { asc, eq, inArray, isNull, and } from "drizzle-orm";
import { can } from "@repo/auth";
import { getDb, rates, roomTypes, units } from "@repo/db";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { setRoomTypeStatus, setUnitStatus } from "./actions";
import { AddUnitsForm, RoomTypeForm } from "./forms";

export const metadata = { title: "Rooms and units" };

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const dayLabel = { weekday: "Sun to Thu", weekend: "Fri and Sat", any: "Every night" } as const;
const statusLook = {
  active: "bg-good/10 text-good",
  maintenance: "bg-warn/10 text-warn",
  inactive: "bg-ink/5 text-muted",
} as const;

/** A resort's room types and their units (RM-01, RM-02), with each type's base rates for reference. */
export default async function RoomsPage({ params }: PageProps<"/[property]/rooms">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  const manage = can(staff, "rooms.manage", property.id);
  const db = getDb();

  const types = await db.select().from(roomTypes).where(eq(roomTypes.propertyId, property.id)).orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));
  const ids = types.map((t) => t.id);
  const allUnits = ids.length ? await db.select().from(units).where(inArray(units.roomTypeId, ids)).orderBy(asc(units.sortOrder), asc(units.name)) : [];
  const baseRates = ids.length ? await db.select().from(rates).where(and(inArray(rates.roomTypeId, ids), isNull(rates.seasonId))) : [];

  return (
    <div>
      <h1 className="text-[1.35rem] font-semibold">Rooms and units</h1>
      <p className="mt-1 text-muted">
        {types.length} room types, {allUnits.filter((u) => u.status === "active").length} units in use. A room type is a kind of room, such as Garden Cottage; its units are the rooms themselves.
      </p>

      {manage && <RoomTypeForm propertyId={property.id} />}

      <ul className="mt-8 grid gap-4">
        {types.map((type) => {
          const own = allUnits.filter((u) => u.roomTypeId === type.id);
          const typeRates = baseRates.filter((r) => r.roomTypeId === type.id);
          return (
            <li key={type.id} className={`card p-5 ${type.status === "inactive" ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[1.15rem] font-semibold">
                    {type.name}
                    {type.status === "inactive" && <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-[0.75rem] font-medium text-muted">Off sale</span>}
                  </h2>
                  <p className="mt-0.5 text-[0.88rem] text-muted">
                    {type.category} · code {type.code} · base price covers {type.baseOccupancy} · {type.minGuests > 1 ? `${type.minGuests} to ` : "up to "}
                    {type.maxGuests} guests{type.extraBedAllowed ? " · extra bed" : ""}
                  </p>
                </div>
                {manage && (
                  <form action={setRoomTypeStatus.bind(null, type.id, type.status === "active" ? "inactive" : "active")}>
                    <button type="submit" className="button-quiet">
                      {type.status === "active" ? "Take off sale" : "Put on sale"}
                    </button>
                  </form>
                )}
              </div>

              {typeRates.length > 0 && (
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[0.88rem]">
                  {typeRates.map((rate) => (
                    <div key={rate.id}>
                      <dt className="inline text-muted">{dayLabel[rate.dayKind]}: </dt>
                      <dd className="inline font-medium">
                        {rupees(rate.basePaise)} {rate.basis === "person" ? "a person" : "a room"}, {rate.mealPlan}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <h3 className="mt-4 text-[0.8rem] font-semibold text-muted">Units ({own.length})</h3>
              {own.length === 0 ? (
                <p className="mt-1 text-[0.88rem] text-muted">No units yet. Add them below.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {own.map((unit) => (
                    <li key={unit.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[0.88rem]">
                      <span>{unit.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[0.72rem] font-medium ${statusLook[unit.status]}`}>{unit.status}</span>
                      {manage && unit.status !== "active" && (
                        <form action={setUnitStatus.bind(null, unit.id, "active")}>
                          <button type="submit" className="text-[0.78rem] underline underline-offset-2">
                            Back in use
                          </button>
                        </form>
                      )}
                      {manage && unit.status === "active" && (
                        <form action={setUnitStatus.bind(null, unit.id, "maintenance")}>
                          <button type="submit" className="text-[0.78rem] text-muted underline underline-offset-2">
                            Maintenance
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {manage && <AddUnitsForm roomTypeId={type.id} suggestion={type.category === "room" ? "Room" : type.category[0].toUpperCase() + type.category.slice(1)} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { asc, eq, inArray } from "drizzle-orm";
import { can } from "@repo/auth";
import { ageBands, getDb, rateChildPrices, rates, roomTypes, seasons } from "@repo/db";
import { NoAccess } from "@/components/no-access";
import { longDate, mealLabel, nightsLabel, rupees } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { BandForm, DeleteSeasonButton, RateForm, RemoveRateButton, SeasonForm, WeekendForm, type RateValues } from "./forms";

export const metadata = { title: "Prices" };

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayOrder = { weekday: 0, weekend: 1, any: 2 } as const;

/** Room rates, weekend nights, seasons and child age bands (PR-01, PR-02, PR-03, PR-05). */
export default async function PricesPage({ params }: PageProps<"/[property]/prices">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "prices.view", property.id)) return <NoAccess what="prices" />;
  const manage = can(staff, "prices.manage", property.id);
  const db = getDb();

  const types = await db.select({ id: roomTypes.id, name: roomTypes.name, status: roomTypes.status }).from(roomTypes).where(eq(roomTypes.propertyId, property.id)).orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));
  const bands = await db.select().from(ageBands).where(eq(ageBands.propertyId, property.id)).orderBy(asc(ageBands.sortOrder), asc(ageBands.minAge));
  const seasonRows = await db.select().from(seasons).where(eq(seasons.propertyId, property.id)).orderBy(asc(seasons.startsOn));
  const rateRows = types.length ? await db.select().from(rates).where(inArray(rates.roomTypeId, types.map((t) => t.id))) : [];
  const childRows = rateRows.length ? await db.select().from(rateChildPrices).where(inArray(rateChildPrices.rateId, rateRows.map((r) => r.id))) : [];

  const paidBands = bands.filter((b) => !b.free).map(({ id, label }) => ({ id, label }));
  const asValues = (rate: (typeof rateRows)[number]): RateValues & { id: string; seasonId: string | null } => ({
    id: rate.id,
    seasonId: rate.seasonId,
    roomTypeId: rate.roomTypeId,
    dayKind: rate.dayKind,
    basis: rate.basis,
    basePaise: rate.basePaise,
    extraAdultPaise: rate.extraAdultPaise,
    extraBedPaise: rate.extraBedPaise,
    mealPlan: rate.mealPlan,
    children: Object.fromEntries(childRows.filter((c) => c.rateId === rate.id).map((c) => [c.ageBandId, c.paise])),
  });
  const all = rateRows.map(asValues).sort((a, b) => dayOrder[a.dayKind] - dayOrder[b.dayKind]);
  const baseRates = all.filter((r) => r.seasonId === null);

  const rateTable = (list: typeof all, showType: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-[0.86rem]">
        <thead className="text-[0.76rem] text-muted">
          <tr className="border-b border-line">
            {showType && <th className="py-1.5 pr-3 font-semibold">Room type</th>}
            <th className="py-1.5 pr-3 font-semibold">Nights</th>
            <th className="py-1.5 pr-3 font-semibold">Price a night</th>
            <th className="py-1.5 pr-3 font-semibold">Extra adult</th>
            <th className="py-1.5 pr-3 font-semibold">Extra bed</th>
            <th className="py-1.5 pr-3 font-semibold">Children</th>
            <th className="py-1.5 pr-3 font-semibold">Meals</th>
            {manage && <th className="py-1.5" />}
          </tr>
        </thead>
        <tbody>
          {list.map((rate) => (
            <tr key={rate.id} className="border-b border-line last:border-0">
              {showType && <td className="py-1.5 pr-3">{types.find((t) => t.id === rate.roomTypeId)?.name}</td>}
              <td className="py-1.5 pr-3">{nightsLabel[rate.dayKind]}</td>
              <td className="py-1.5 pr-3 font-medium">
                {rupees(rate.basePaise)} {rate.basis === "person" ? "an adult" : "a room"}
              </td>
              <td className="py-1.5 pr-3">{rate.extraAdultPaise === null ? <span className="text-muted">Not published</span> : rupees(rate.extraAdultPaise)}</td>
              <td className="py-1.5 pr-3">{rate.extraBedPaise === null ? <span className="text-muted">Not published</span> : rupees(rate.extraBedPaise)}</td>
              <td className="py-1.5 pr-3">
                {paidBands.length === 0
                  ? ""
                  : paidBands.map((band) => (
                      <span key={band.id} className="block">
                        {band.label}: {rate.children[band.id] === undefined ? <span className="text-muted">not published</span> : rupees(rate.children[band.id])}
                      </span>
                    ))}
              </td>
              <td className="py-1.5 pr-3">{mealLabel[rate.mealPlan]}</td>
              {manage && (
                <td className="py-1.5 text-right">
                  <RemoveRateButton rateId={rate.id} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <h1 className="text-[1.35rem] font-semibold">Prices</h1>
      <p className="mt-1 max-w-3xl text-muted">
        Each room type has a price for weekday nights and one for weekend nights, or one for every night. A season&apos;s rates beat these on its nights, and a price set for a date in the calendar beats both. Children pay by age band; older
        guests pay as adults.
      </p>

      <section className="card mt-6 p-5" aria-labelledby="weekend-heading">
        <h2 id="weekend-heading" className="font-semibold">
          Weekend nights
        </h2>
        <p className="text-[0.88rem] text-muted">The nights that take the weekend rate (PR-02). The night of a Friday is the night from Friday to Saturday.</p>
        {manage ? (
          <WeekendForm propertyId={property.id} nights={property.weekendNights} />
        ) : (
          <p className="mt-2">{property.weekendNights.length ? property.weekendNights.map((n) => weekdayNames[n]).join(", ") : "None"}</p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="rates-heading">
        <h2 id="rates-heading" className="text-[1.15rem] font-semibold">
          Room rates
        </h2>
        <ul className="mt-3 grid gap-4">
          {types.map((type) => {
            const own = baseRates.filter((r) => r.roomTypeId === type.id);
            return (
              <li key={type.id} className={`card p-5 ${type.status === "inactive" ? "opacity-70" : ""}`}>
                <h3 className="font-semibold">
                  {type.name}
                  {type.status === "inactive" && <span className="ml-2 text-[0.8rem] font-normal text-muted">(off sale)</span>}
                </h3>
                {own.length === 0 ? <p className="mt-1 text-[0.9rem] text-warn">No rate yet. Guests see &ldquo;rate to confirm&rdquo; for this room type.</p> : <div className="mt-2">{rateTable(own, false)}</div>}
                {manage && (
                  <details className="mt-3 border-t border-line pt-3">
                    <summary className="cursor-pointer text-[0.9rem] font-semibold">{own.length ? "Change or add a rate" : "Add a rate"}</summary>
                    <div className="mt-3">
                      <RateForm propertyId={property.id} roomTypes={[{ id: type.id, name: type.name }]} bands={paidBands} existing={own} />
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="seasons-heading">
        <h2 id="seasons-heading" className="text-[1.15rem] font-semibold">
          Seasons
        </h2>
        <p className="text-[0.88rem] text-muted">Named runs of nights, such as Diwali or Christmas and New Year, with their own rates (PR-03). Where seasons overlap, the higher priority wins. A room type without a season rate keeps its usual rate.</p>
        {manage && (
          <div className="card mt-3 p-5">
            <SeasonForm propertyId={property.id} />
          </div>
        )}
        <ul className="mt-4 grid gap-4">
          {seasonRows.map((season) => {
            const own = all.filter((r) => r.seasonId === season.id);
            return (
              <li key={season.id} className="card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">
                    {season.name}{" "}
                    <span className="font-normal text-muted">
                      · {longDate(season.startsOn)} to {longDate(season.endsOn)} · priority {season.priority}
                    </span>
                  </h3>
                  {manage && <DeleteSeasonButton seasonId={season.id} />}
                </div>
                {own.length === 0 ? <p className="mt-1 text-[0.9rem] text-muted">No season rates yet, so every room type keeps its usual rate.</p> : <div className="mt-2">{rateTable(own, true)}</div>}
                {manage && (
                  <details className="mt-3 border-t border-line pt-3">
                    <summary className="cursor-pointer text-[0.9rem] font-semibold">Set a season rate</summary>
                    <div className="mt-3">
                      <RateForm propertyId={property.id} roomTypes={types.map(({ id, name }) => ({ id, name }))} seasonId={season.id} bands={paidBands} existing={own} />
                    </div>
                  </details>
                )}
              </li>
            );
          })}
          {seasonRows.length === 0 && <li className="text-[0.9rem] text-muted">No seasons yet.</li>}
        </ul>
      </section>

      <section className="card mt-8 p-5" aria-labelledby="bands-heading">
        <h2 id="bands-heading" className="font-semibold">
          Child age bands
        </h2>
        <p className="text-[0.88rem] text-muted">Children pay by band (PR-05). Guests older than every band pay as adults. A free band never pays.</p>
        <ul className="mt-3 grid gap-3">
          {bands.map((band) =>
            manage ? (
              <li key={band.id}>
                <BandForm propertyId={property.id} band={band} />
              </li>
            ) : (
              <li key={band.id} className="text-[0.9rem]">
                {band.label}: ages {band.minAge} to {band.maxAge}
                {band.free ? ", free" : ""}
              </li>
            ),
          )}
        </ul>
        {manage && (
          <div className="mt-4 border-t border-line pt-4">
            <BandForm propertyId={property.id} />
          </div>
        )}
      </section>
    </div>
  );
}

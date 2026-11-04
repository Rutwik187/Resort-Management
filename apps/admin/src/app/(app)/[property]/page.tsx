import Link from "next/link";
import { can } from "@repo/auth";
import { todayInIndia } from "@repo/engine";
import { ColumnChart } from "@/components/column-chart";
import { NoAccess } from "@/components/no-access";
import { resortToday } from "@/lib/dashboard";
import { balance, longDate, plural, rupees, shortDate, statusLabel, statusLook } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Today" };

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

/** Round ticks from zero that cover the largest value, such as 0, 25K, 50K. */
function ticksFor(max: number) {
  if (max <= 0) return [0];
  const rough = max / 2;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** A resort's day: arrivals, departures, guests in, sales, rooms and charts (ADM-01, ADM-02). */
export default async function TodayPage({ params }: PageProps<"/[property]">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "dashboard.view", property.id)) return <NoAccess what="the dashboard" />;
  const may = (permission: Parameters<typeof can>[1]) => can(staff, permission, property.id);
  const money = may("reports.daily") || may("reports.view");
  const people = may("bookings.view");
  const rooms = may("inventory.view");

  const today = todayInIndia();
  const day = await resortToday(property, today);
  const base = `/${property.code.toLowerCase()}`;
  const occupancy = day.unitsInUse ? Math.round((day.tonight.booked / day.unitsInUse) * 100) : 0;

  const salesTop = Math.max(...day.salesDays.map((d) => d.paise / 100));
  const salesTicks = ticksFor(salesTop);

  return (
    <div>
      <h1 className="text-[1.35rem] font-semibold">Today, {longDate(today)}</h1>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {people && (
          <>
            <Tile label="Arriving today" value={String(day.arrivals.length)} note={plural(day.arrivals.filter((b) => b.status === "checked_in").length, "already in", "already in")} />
            <Tile label="Leaving today" value={String(day.departures.length)} note={plural(day.departures.filter((b) => b.status === "checked_out").length, "already left", "already left")} />
            <Tile label="In the resort" value={String(day.inHouse.length)} note={day.inHouse.length === 1 ? "booking checked in" : "bookings checked in"} />
          </>
        )}
        {rooms && <Tile label="Rooms booked tonight" value={`${occupancy}%`} note={`${day.tonight.booked} of ${plural(day.unitsInUse, "room")}`} />}
        {money && (
          <>
            <Tile label="Sales today" value={rupees(day.sales.todayPaise)} note={plural(day.sales.todayCount, "booking")} />
            <Tile label="Sales this month" value={rupees(day.sales.monthPaise)} note={plural(day.sales.monthCount, "booking")} />
            <Tile label="Still to collect" value={rupees(day.collect.paise)} note={plural(day.collect.count, "booking")} />
          </>
        )}
      </dl>

      {people && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Guests title="Arriving today" rows={day.arrivals} empty="No arrivals today." base={base} />
          <Guests title="Leaving today" rows={day.departures} empty="No departures today." base={base} />
          {day.inHouse.length > 0 && <Guests title="In the resort now" rows={day.inHouse} empty="" base={base} />}
        </div>
      )}

      {rooms && (
        <section className="card mt-6 p-5" aria-labelledby="low-heading">
          <h2 id="low-heading" className="font-semibold">
            Rooms running low, next 14 nights
          </h2>
          <p className="text-[0.85rem] text-muted">
            Room types with {plural(property.lowStockThreshold, "room")} or fewer free on a night (INV-10). Change the limit in the resort&apos;s settings.
          </p>
          {day.low.length === 0 ? (
            <p className="mt-3 text-[0.9rem]">Every room type has rooms free on every night.</p>
          ) : (
            <ul className="mt-3 grid gap-1.5 text-[0.9rem] sm:grid-cols-2">
              {day.low.slice(0, 12).map((entry) => (
                <li key={`${entry.roomType}-${entry.night}`} className="flex justify-between gap-3 rounded-lg bg-page px-3 py-2">
                  <span>
                    {shortDate(entry.night)} · {entry.roomType}
                  </span>
                  <span className={`shrink-0 font-medium whitespace-nowrap ${entry.free <= 0 ? "text-danger" : "text-warn"}`}>{entry.free <= 0 ? "Full" : `${entry.free} left`}</span>
                </li>
              ))}
            </ul>
          )}
          {day.low.length > 12 && <p className="mt-2 text-[0.85rem] text-muted">And {day.low.length - 12} more nights.</p>}
        </section>
      )}

      {(money || rooms) && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {money && (
            <ColumnChart
              title="Sales, last 30 days"
              caption="Bookings made each day that are paid or part paid, at their full price."
              columns={day.salesDays.map((d) => ({ key: d.day, label: shortDate(d.day), axis: shortDate(d.day).split(" ").slice(1).join(" "), value: d.paise / 100, display: rupees(d.paise), detail: plural(d.count, "booking") }))}
              ticks={salesTicks.map((value) => ({ value, label: `₹${compact.format(value)}` }))}
              max={salesTicks[salesTicks.length - 1]}
              empty={salesTop === 0 ? "No paid bookings were made in the last 30 days." : undefined}
            />
          )}
          {rooms && (
            <ColumnChart
              title="Rooms booked, next 30 nights"
              caption={`Share of the ${plural(day.unitsInUse, "room")} in use that are booked each night.`}
              columns={day.nights.map((n) => ({
                key: n.night,
                label: shortDate(n.night),
                axis: shortDate(n.night).split(" ").slice(1).join(" "),
                value: n.units ? (n.booked / n.units) * 100 : 0,
                display: `${n.units ? Math.round((n.booked / n.units) * 100) : 0}%`,
                detail: `${n.booked} of ${n.units}`,
              }))}
              ticks={[0, 50, 100].map((value) => ({ value, label: `${value}%` }))}
              max={100}
              empty={day.unitsInUse === 0 ? "This resort has no rooms in use yet." : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, note, href }: { label: string; value: string; note?: string; href?: string }) {
  const body = (
    <>
      <dt className="text-[0.8rem] text-muted">{label}</dt>
      <dd className="mt-1 text-[1.5rem] leading-tight font-semibold">{value}</dd>
      {note && <dd className="mt-0.5 text-[0.8rem] text-muted">{note}</dd>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4 hover:border-ink/30">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

type Row = Awaited<ReturnType<typeof resortToday>>["arrivals"][number];

function Guests({ title, rows, empty, base }: { title: string; rows: Row[]; empty: string; base: string }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">
        {title} <span className="font-normal text-muted">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-[0.9rem] text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((row) => {
            const due = balance(row);
            return (
              <li key={row.id}>
                <Link href={`${base}/bookings/${row.number.toLowerCase()}`} className="-mx-2 flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-page">
                  <span>
                    <span className="font-medium">{row.guestName}</span>
                    <span className="text-[0.85rem] text-muted">
                      {" "}
                      · {row.number}
                      {row.checkIn && row.checkOut ? ` · ${shortDate(row.checkIn)} to ${shortDate(row.checkOut)}` : " · day visit"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-[0.8rem]">
                    {due !== null && due > 0 && <span className="text-warn">{rupees(due)} to pay</span>}
                    <span className={`rounded-full px-2 py-0.5 font-medium ${statusLook[row.status]}`}>{statusLabel[row.status]}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

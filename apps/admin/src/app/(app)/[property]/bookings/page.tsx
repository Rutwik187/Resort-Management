import Link from "next/link";
import { z } from "zod";
import { can } from "@repo/auth";
import { allowedMoves, todayInIndia } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { findBookings, pageSize, type BookingFilters } from "@/lib/bookings";
import { balance, price, rupees, shortDate, sourceLabel, statusLabel, statusLook, when } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Bookings" };

const statuses = Object.keys(allowedMoves) as (keyof typeof allowedMoves)[];
const sources = Object.keys(sourceLabel) as (keyof typeof sourceLabel)[];
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined);
const filterInput = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(statuses).optional().catch(undefined),
  source: z.enum(sources).optional().catch(undefined),
  paid: z.enum(["unpaid", "part", "full"]).optional().catch(undefined),
  arrivingFrom: day,
  arrivingTo: day,
  bookedFrom: day,
  bookedTo: day,
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

/** Every booking at the resort, with filters and search (ADM-03). */
export default async function BookingsPage({ params, searchParams }: PageProps<"/[property]/bookings">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "bookings.view", property.id)) return <NoAccess what="bookings" />;

  const raw = Object.fromEntries(Object.entries(await searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value || undefined]));
  const filters: BookingFilters = filterInput.parse(raw);
  const { rows, total } = await findBookings([property.id], filters);
  const base = `/${property.code.toLowerCase()}/bookings`;
  const today = todayInIndia();
  const filtered = Object.values(filters).some((value) => value !== undefined && value !== "");
  const pageNumber = filters.page ?? 1;
  const linkTo = (changes: Partial<BookingFilters>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...changes })) if (value !== undefined && value !== "") query.set(key, String(value));
    const text = query.toString();
    return text ? `${base}?${text}` : base;
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[1.35rem] font-semibold">Bookings</h1>
        <nav aria-label="Quick lists" className="flex flex-wrap gap-2 text-[0.88rem]">
          <Link href={`${base}?arrivingFrom=${today}&arrivingTo=${today}`} className="button-quiet">
            Arriving today
          </Link>
          <Link href={`${base}?status=checked_in`} className="button-quiet">
            In the resort
          </Link>
          <Link href={`${base}?status=pending_payment`} className="button-quiet">
            Waiting for payment
          </Link>
        </nav>
      </div>

      <form className="card mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" role="search">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Booking number, name, phone or email" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className="field">
            <option value="">Any status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel[status]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="paid">
            Payment
          </label>
          <select id="paid" name="paid" defaultValue={filters.paid ?? ""} className="field">
            <option value="">Any payment</option>
            <option value="unpaid">Nothing paid</option>
            <option value="part">Part paid</option>
            <option value="full">Fully paid</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="arrivingFrom">
            Arriving from
          </label>
          <input id="arrivingFrom" name="arrivingFrom" type="date" defaultValue={filters.arrivingFrom} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="arrivingTo">
            Arriving to
          </label>
          <input id="arrivingTo" name="arrivingTo" type="date" defaultValue={filters.arrivingTo} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="bookedFrom">
            Booked from
          </label>
          <input id="bookedFrom" name="bookedFrom" type="date" defaultValue={filters.bookedFrom} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="bookedTo">
            Booked to
          </label>
          <input id="bookedTo" name="bookedTo" type="date" defaultValue={filters.bookedTo} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="source">
            Source
          </label>
          <select id="source" name="source" defaultValue={filters.source ?? ""} className="field">
            <option value="">Any source</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {sourceLabel[source]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button type="submit" className="button">
            Show bookings
          </button>
          {filtered && (
            <Link href={base} className="button-quiet">
              Clear
            </Link>
          )}
        </div>
      </form>

      <p className="mt-6 text-[0.88rem] text-muted" role="status">
        {total === 0 ? (filtered ? "No bookings match." : "No bookings yet.") : `${total} ${total === 1 ? "booking" : "bookings"}${total > pageSize ? `, page ${pageNumber} of ${Math.ceil(total / pageSize)}` : ""}.`}
      </p>

      {rows.length > 0 && (
        <div className="card mt-2 overflow-x-auto">
          <table className="w-full min-w-[54rem] text-left text-[0.88rem]">
            <thead className="border-b border-line text-[0.78rem] text-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Booking</th>
                <th className="px-4 py-2.5 font-semibold">Guest</th>
                <th className="px-4 py-2.5 font-semibold">Dates</th>
                <th className="px-4 py-2.5 font-semibold">Rooms or tickets</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                <th className="px-4 py-2.5 text-right font-semibold">To pay</th>
                <th className="px-4 py-2.5 font-semibold">Booked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const due = balance(row);
                return (
                  <tr key={row.id} className="border-b border-line last:border-0 hover:bg-page">
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                      <Link href={`${base}/${row.number.toLowerCase()}`} className="underline-offset-2 hover:underline">
                        {row.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="block">{row.guestName}</span>
                      {row.guestPhone && <span className="text-[0.8rem] text-muted">+{row.guestPhone}</span>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{row.checkIn && row.checkOut ? `${shortDate(row.checkIn)} to ${shortDate(row.checkOut)}` : row.visitDate ? shortDate(row.visitDate) : ""}</td>
                    <td className="px-4 py-2.5">{row.items}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[0.75rem] font-medium whitespace-nowrap ${statusLook[row.status]}`}>{statusLabel[row.status]}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">{price(row.totalPaise)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">{due === null ? "" : due === 0 ? "Paid" : rupees(due)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                      {when(row.createdAt)}
                      <span className="block text-[0.78rem]">{sourceLabel[row.source]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > pageSize && (
        <nav aria-label="Pages" className="mt-4 flex gap-2">
          {pageNumber > 1 && (
            <Link href={linkTo({ page: pageNumber - 1 })} className="button-quiet">
              Newer
            </Link>
          )}
          {pageNumber * pageSize < total && (
            <Link href={linkTo({ page: pageNumber + 1 })} className="button-quiet">
              Older
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

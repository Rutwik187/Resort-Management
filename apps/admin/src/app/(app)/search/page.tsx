import Link from "next/link";
import { redirect } from "next/navigation";
import { accessibleProperties, can } from "@repo/auth";
import { getDb } from "@repo/db";
import { findBookings } from "@/lib/bookings";
import { price, shortDate, statusLabel, statusLook } from "@/lib/format";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Find a booking" };

/** One search box for every resort this person can see: booking numbers, phone numbers, names and emails. */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const staff = await requireStaffPage();
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const resorts = (await accessibleProperties(getDb(), staff)).filter((resort) => can(staff, "bookings.view", resort.id));
  const { rows, total } = q ? await findBookings(resorts.map((r) => r.id), { q }) : { rows: [], total: 0 };

  // A booking number typed in full goes straight to the booking.
  if (rows.length === 1 && rows[0].number.toLowerCase() === q.toLowerCase()) {
    redirect(`/${rows[0].propertyCode.toLowerCase()}/bookings/${rows[0].number.toLowerCase()}`);
  }

  return (
    <div>
      <h1 className="text-[1.35rem] font-semibold">Find a booking</h1>
      <form className="mt-4 flex max-w-xl gap-2" role="search">
        <label htmlFor="search-q" className="sr-only">
          Booking number, phone, name or email
        </label>
        <input id="search-q" name="q" type="search" defaultValue={q} placeholder="Booking number, phone, name or email" className="field" />
        <button type="submit" className="button">
          Search
        </button>
      </form>
      {q && (
        <p className="mt-5 text-[0.88rem] text-muted-foreground" role="status">
          {total === 0 ? `Nothing matches “${q}”.` : `${total} ${total === 1 ? "booking matches" : "bookings match"} “${q}”${total > rows.length ? `; the newest ${rows.length} are shown` : ""}.`}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="card mt-2 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/${row.propertyCode.toLowerCase()}/bookings/${row.number.toLowerCase()}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-muted">
                <span>
                  <span className="font-medium">{row.number}</span>
                  <span className="text-muted-foreground"> · {row.guestName}</span>
                  {row.guestPhone && <span className="text-muted-foreground"> · +{row.guestPhone}</span>}
                </span>
                <span className="flex items-center gap-3 text-[0.88rem]">
                  <span className="text-muted-foreground">{row.checkIn ? `${shortDate(row.checkIn)} to ${shortDate(row.checkOut!)}` : row.visitDate ? shortDate(row.visitDate) : ""}</span>
                  <span>{price(row.totalPaise)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[0.75rem] font-medium ${statusLook[row.status]}`}>{statusLabel[row.status]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

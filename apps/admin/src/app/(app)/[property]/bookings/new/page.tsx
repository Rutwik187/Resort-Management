import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { can } from "@repo/auth";
import { ageBands, getDb, roomTypes } from "@repo/db";
import { addDays, isDate, searchStays, seatsLeft, todayInIndia } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { longDate, plural } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { NewBookingForm, type Option } from "./booking-form";

export const metadata = { title: "New booking" };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** An offline booking for a walk-in, phone, WhatsApp, travel agent or corporate guest (ADM-06). */
export default async function NewBookingPage({ params, searchParams }: PageProps<"/[property]/bookings/new">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "bookings.create", property.id)) return <NoAccess what="new bookings" />;

  const query = await searchParams;
  const kind = one(query.kind) === "day" ? "day" : "stay";
  const today = todayInIndia();
  const checkIn = one(query.checkIn) ?? today;
  const checkOut = one(query.checkOut) ?? addDays(checkIn && isDate(checkIn) ? checkIn : today, 1);
  const day = one(query.day) ?? today;
  const asked = kind === "stay" ? Boolean(one(query.checkIn)) : Boolean(one(query.day));

  let problem: string | null = null;
  if (asked && kind === "stay") {
    if (!isDate(checkIn) || !isDate(checkOut)) problem = "Choose both dates.";
    else if (checkIn < today) problem = "Check-in can't be in the past.";
    else if (checkOut <= checkIn) problem = "Check-out must be after check-in.";
  }
  if (asked && kind === "day") {
    if (!isDate(day)) problem = "Choose the date.";
    else if (day < today) problem = "The date can't be in the past.";
  }

  const db = getDb();
  let options: Option[] = [];
  if (asked && !problem) {
    if (kind === "stay") {
      const stays = await searchStays(db, property.id, checkIn, checkOut);
      const limits = stays.length
        ? await db
            .select({ id: roomTypes.id, maxAdults: roomTypes.maxAdults, maxGuests: roomTypes.maxGuests, extraBedAllowed: roomTypes.extraBedAllowed })
            .from(roomTypes)
            .where(inArray(roomTypes.id, stays.map((s) => s.roomTypeId)))
        : [];
      options = stays.map((stay) => {
        const limit = limits.find((l) => l.id === stay.roomTypeId)!;
        return { id: stay.roomTypeId, name: stay.name, available: stay.freeUnits, closedReason: stay.closedReason, maxAdults: limit.maxAdults, maxGuests: limit.maxGuests, extraBedAllowed: limit.extraBedAllowed };
      });
    } else {
      const seats = await seatsLeft(db, property.id, day);
      options = seats.map((seat) => ({
        id: seat.slotId,
        name: `${seat.offeringName}, ${seat.slotLabel}`,
        available: seat.left,
        closedReason: seat.closedReason,
        maxAdults: Math.max(1, seat.left),
        maxGuests: seat.left,
        extraBedAllowed: false,
      }));
    }
  }
  const bands = await db.select({ code: ageBands.code, label: ageBands.label }).from(ageBands).where(eq(ageBands.propertyId, property.id)).orderBy(asc(ageBands.sortOrder));
  const base = `/${property.code.toLowerCase()}/bookings/new`;
  const tab = (active: boolean) => `rounded-md px-3 py-1.5 text-[0.9rem] ${active ? "bg-accent font-semibold text-accent-ink" : "text-muted hover:text-ink"}`;

  return (
    <div>
      <h1 className="text-[1.35rem] font-semibold">New booking</h1>
      <p className="mt-1 max-w-2xl text-muted">For walk-in, phone, WhatsApp, travel agent and corporate guests. It books through the same engine as the website, so rooms and seats stay right everywhere.</p>

      <div className="card mt-5 p-4">
        <nav aria-label="Kind of booking" className="inline-flex gap-1 rounded-lg bg-page p-1">
          <Link href={base} aria-current={kind === "stay" ? "page" : undefined} className={tab(kind === "stay")}>
            A stay
          </Link>
          <Link href={`${base}?kind=day`} aria-current={kind === "day" ? "page" : undefined} className={tab(kind === "day")}>
            A day visit
          </Link>
        </nav>
        <form className="mt-4 flex flex-wrap items-end gap-3">
          {kind === "stay" ? (
            <>
              <div>
                <label className="label" htmlFor="checkIn">
                  Check-in
                </label>
                <input id="checkIn" name="checkIn" type="date" required min={today} defaultValue={checkIn} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="checkOut">
                  Check-out
                </label>
                <input id="checkOut" name="checkOut" type="date" required min={today} defaultValue={checkOut} className="field" />
              </div>
            </>
          ) : (
            <div>
              <input type="hidden" name="kind" value="day" />
              <label className="label" htmlFor="day">
                Date
              </label>
              <input id="day" name="day" type="date" required min={today} defaultValue={day} className="field" />
            </div>
          )}
          <button type="submit" className="button">
            {kind === "stay" ? "Find rooms" : "Find tickets"}
          </button>
          {problem && (
            <p role="alert" className="w-full text-[0.9rem] text-danger">
              {problem}
            </p>
          )}
          {asked && !problem && (
            <p className="w-full text-[0.88rem] text-muted">
              {kind === "stay" ? `${longDate(checkIn)} to ${longDate(checkOut)}, ${plural(Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000), "night")}.` : `${longDate(day)}.`}
            </p>
          )}
        </form>
      </div>

      {asked && !problem && (
        <NewBookingForm
          key={kind === "stay" ? `${checkIn}-${checkOut}` : day}
          propertyId={property.id}
          kind={kind}
          dates={kind === "stay" ? { checkIn, checkOut } : { day }}
          options={options}
          bands={bands}
          canOverride={can(staff, "prices.manage", property.id)}
          canTakePayment={can(staff, "bookings.modify", property.id)}
        />
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@repo/auth";
import { getDb } from "@repo/db";
import { freeUnits, todayInIndia, type Quote } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { loadBooking, type LoadedBooking } from "@/lib/bookings";
import { balance, clock, longDate, methodLabel, partyLabel, plural, price, rupees, shortDate, sourceLabel, statusLabel, statusLook, when } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { CancelForm, MoveButton, NoteForm, PaymentForm, PriceForm, PrintButton, RoomForm } from "./forms";

export async function generateMetadata({ params }: PageProps<"/[property]/bookings/[number]">) {
  return { title: (await params).number.toUpperCase() };
}

const open = ["pending_payment", "part_paid", "confirmed", "checked_in"];

/** One booking: guest, stay, prices, payments, actions and timeline (ADM-04, ADM-05). */
export default async function BookingPage({ params }: PageProps<"/[property]/bookings/[number]">) {
  const staff = await requireStaffPage();
  const { property: code, number } = await params;
  const property = await propertyFromCode(code, staff);
  if (!can(staff, "bookings.view", property.id)) return <NoAccess what="bookings" />;
  const loaded = await loadBooking(property.id, number);
  if (!loaded) notFound();
  const { booking, guest, items, payments, hold, bands, people } = loaded;

  const may = (permission: Parameters<typeof can>[1]) => can(staff, permission, property.id);
  const today = todayInIndia();
  const due = booking.checkIn ?? booking.visitDate;
  const arrived = due !== null && today >= due;
  const left = balance(booking);
  const quote = booking.quote as Quote | null;
  const roomsBooked = booking.status === "confirmed" || booking.status === "part_paid";
  const takesMoney = ["pending_payment", "part_paid", "confirmed", "checked_in", "checked_out"].includes(booking.status) && left !== 0;

  // Free rooms of the same type, for moving a stay before check-in.
  const moves = new Map<string, { id: string; name: string }[]>();
  if (roomsBooked && may("bookings.modify") && booking.checkIn && booking.checkOut) {
    for (const { item } of items) {
      if (item.kind === "stay" && item.roomTypeId) moves.set(item.id, await freeUnits(getDb(), item.roomTypeId, booking.checkIn, booking.checkOut));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.85rem] text-muted print:hidden">
            <Link href={`/${property.code.toLowerCase()}/bookings`} className="underline-offset-2 hover:underline">
              Bookings
            </Link>{" "}
            /
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-[1.5rem] font-semibold">
            {booking.number}
            <span className={`rounded-full px-2.5 py-0.5 text-[0.8rem] font-medium ${statusLook[booking.status]}`}>{statusLabel[booking.status]}</span>
          </h1>
          <p className="mt-1 text-[0.88rem] text-muted">
            {sourceLabel[booking.source]} booking, made {when(booking.createdAt)}
            {booking.createdBy ? ` by ${people.get(booking.createdBy) ?? "staff"}` : ""}. <span className="hidden print:inline">{property.name}.</span>
          </p>
        </div>
        <PrintButton />
      </div>

      {booking.status === "pending_payment" && hold && (
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-[0.9rem] text-warn print:hidden">
          {hold.expiresAt > new Date()
            ? `The rooms or seats are held until ${clock(hold.expiresAt)}. Record a payment to keep them.`
            : `The hold ran out at ${clock(hold.expiresAt)}, so the rooms or seats are back on sale. A payment now takes them again if they are still free.`}
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_20rem] lg:grid-rows-[auto_1fr]">
        <aside className="grid content-start gap-5 lg:col-start-2 lg:row-start-1">
          <GuestCard guest={guest} />
          {open.includes(booking.status) && (may("bookings.modify") || may("bookings.cancel") || may("prices.manage")) && (
            <section className="card grid gap-3 p-5 print:hidden" aria-labelledby="actions-heading">
              <h2 id="actions-heading" className="font-semibold">
                Front desk
              </h2>
              {may("bookings.modify") && roomsBooked && (arrived ? <MoveButton bookingId={booking.id} to="checked_in" label="Check in" /> : <p className="text-[0.88rem] text-muted">Check-in opens on {shortDate(due!)}.</p>)}
              {may("bookings.modify") && booking.status === "checked_in" && <MoveButton bookingId={booking.id} to="checked_out" label="Check out" />}
              {may("bookings.modify") && roomsBooked && arrived && <MoveButton bookingId={booking.id} to="no_show" label="Mark as no-show" quiet />}
              {booking.status === "pending_payment" && <p className="text-[0.88rem] text-muted">Record a payment first. Check-in opens once the booking is paid or part paid.</p>}
              {may("prices.manage") && booking.status !== "checked_out" && <PriceForm bookingId={booking.id} current={booking.totalPaise === null ? "" : String(booking.totalPaise / 100)} />}
              {may("bookings.cancel") && booking.status !== "checked_in" && <CancelForm bookingId={booking.id} />}
            </section>
          )}
        </aside>

        <div className="grid content-start gap-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <section className="card p-5" aria-labelledby="stay-heading">
            <h2 id="stay-heading" className="font-semibold">
              {booking.checkIn && booking.checkOut ? "Stay" : "Day visit"}
            </h2>
            <p className="mt-1">
              {booking.checkIn && booking.checkOut
                ? `${longDate(booking.checkIn)} to ${longDate(booking.checkOut)}, ${plural(quote?.lines.find((l) => l.kind === "stay")?.nights.length ?? 0, "night")}`
                : booking.visitDate
                  ? longDate(booking.visitDate)
                  : ""}
            </p>
            <ul className="mt-4 grid gap-3">
              {items.map(({ item, roomTypeName, unitName, offeringName, slotLabel }, index) => {
                const line = quote?.lines[index];
                return (
                  <li key={item.id} className="rounded-lg border border-line p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">
                        {item.kind === "stay" ? roomTypeName : offeringName}
                        <span className="font-normal text-muted"> · {item.kind === "stay" ? (unitName ?? "Room to assign") : slotLabel}</span>
                      </p>
                      <p className="font-medium">{price(item.amountPaise)}</p>
                    </div>
                    <p className="mt-0.5 text-[0.88rem] text-muted">
                      {partyLabel(item.party, bands)}
                      {item.extraBeds ? `, ${plural(item.extraBeds, "extra bed")}` : ""}
                    </p>
                    {line?.kind === "stay" && line.nights.length > 0 && (
                      <details className="mt-2 text-[0.85rem]">
                        <summary className="cursor-pointer text-muted">Price for each night</summary>
                        <ul className="mt-1 grid gap-0.5">
                          {line.nights.map((night) => (
                            <li key={night.night} className="flex justify-between gap-3">
                              <span>
                                {shortDate(night.night)} <span className="text-muted">({night.source === "base" ? "base rate" : night.source === "date" ? "price for the date" : `${night.source} season`})</span>
                              </span>
                              <span>{price(night.paise)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {moves.has(item.id) && <RoomForm bookingItemId={item.id} rooms={moves.get(item.id)!} />}
                  </li>
                );
              })}
            </ul>
            {booking.notes && <p className="mt-4 text-[0.9rem]">Notes when booked: {booking.notes}</p>}
          </section>

          <section className="card p-5" aria-labelledby="money-heading">
            <h2 id="money-heading" className="font-semibold">
              Price and payments
            </h2>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-page p-3">
                <dt className="text-[0.78rem] text-muted">Total</dt>
                <dd className="mt-0.5 font-semibold">{price(booking.totalPaise)}</dd>
              </div>
              <div className="rounded-lg bg-page p-3">
                <dt className="text-[0.78rem] text-muted">Paid</dt>
                <dd className="mt-0.5 font-semibold">{rupees(booking.paidPaise)}</dd>
              </div>
              <div className="rounded-lg bg-page p-3">
                <dt className="text-[0.78rem] text-muted">To pay</dt>
                <dd className={`mt-0.5 font-semibold ${left ? "text-warn" : ""}`}>{left === null ? "Price to set" : rupees(left)}</dd>
              </div>
            </dl>
            {quote?.totalPaise !== undefined && booking.totalPaise !== quote?.totalPaise && (
              <p className="mt-3 text-[0.85rem] text-muted">The rates gave {price(quote?.totalPaise)}; staff set this price (see the timeline).</p>
            )}
            {payments.length > 0 && (
              <ul className="mt-4 grid gap-1.5 text-[0.88rem]">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {when(payment.receivedAt)} · {methodLabel[payment.method]}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                      <span className="text-muted">{payment.createdBy ? ` · ${people.get(payment.createdBy) ?? "staff"}` : ""}</span>
                    </span>
                    <span className="ml-auto font-medium">{rupees(payment.amountPaise)}</span>
                  </li>
                ))}
              </ul>
            )}
            {takesMoney && may("bookings.modify") && <PaymentForm bookingId={booking.id} suggested={left ? String(left / 100) : ""} />}
          </section>

          <Timeline loaded={loaded} />
        </div>

        <aside className="grid content-start gap-5 lg:col-start-2 lg:row-start-2">
          {may("bookings.modify") && (
            <section className="card p-5 print:hidden">
              <NoteForm bookingId={booking.id} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Everything that happened to the booking, newest first. */
function Timeline({ loaded }: { loaded: LoadedBooking }) {
  const { events, people } = loaded;
  const by = (userId: string | null) => (userId ? (people.get(userId) ?? "staff") : "the system");
  const say = (event: LoadedBooking["events"][number]) => {
    const data = (event.data ?? {}) as Record<string, unknown>;
    switch (event.type) {
      case "created":
        return `Booked (${sourceLabel[(data.source as keyof typeof sourceLabel) ?? "admin"] ?? "admin"})`;
      case "status":
        return `${event.fromStatus ? statusLabel[event.fromStatus] : "New"} to ${event.toStatus ? statusLabel[event.toStatus] : ""}`;
      case "payment":
        return `Payment of ${rupees(Number(data.amountPaise))} by ${methodLabel[data.method as keyof typeof methodLabel] ?? "other"}${data.reference ? ` (${data.reference})` : ""}`;
      case "price_override":
        return `Price set to ${rupees(Number(data.toPaise))}, from ${price(data.fromPaise as number | null)}`;
      case "unit_assigned":
        return data.from ? `Moved from ${data.from} to ${data.to}` : `Given ${data.to}`;
      case "note":
        return "Note";
      default:
        return event.type;
    }
  };
  return (
    <section className="card p-5" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="font-semibold">
        Timeline
      </h2>
      <ol className="mt-3 grid gap-3">
        {events.map((event) => (
          <li key={event.id} className="border-l-2 border-line pl-3">
            <p className="text-[0.9rem] font-medium">{say(event)}</p>
            {event.note && <p className="text-[0.9rem]">{event.note}</p>}
            <p className="text-[0.78rem] text-muted">
              {when(event.at)} · {by(event.userId)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function GuestCard({ guest }: { guest: LoadedBooking["guest"] }) {
  return (
    <section className="card p-5" aria-labelledby="guest-heading">
      <h2 id="guest-heading" className="font-semibold">
        Guest
      </h2>
      <p className="mt-2 font-medium">{guest.name}</p>
      <ul className="mt-1 grid gap-0.5 text-[0.9rem]">
        {guest.phone && (
          <li>
            <a href={`tel:+${guest.phone}`} className="underline-offset-2 hover:underline">
              +{guest.phone}
            </a>
            <span className="print:hidden">
              {" · "}
              <a href={`https://wa.me/${guest.phone}`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                WhatsApp
              </a>
            </span>
          </li>
        )}
        {guest.email && (
          <li>
            <a href={`mailto:${guest.email}`} className="underline-offset-2 hover:underline">
              {guest.email}
            </a>
          </li>
        )}
        {guest.companyName && <li>{guest.companyName}</li>}
        {guest.companyGstin && <li className="text-muted">GSTIN {guest.companyGstin}</li>}
      </ul>
    </section>
  );
}

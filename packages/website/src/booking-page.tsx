import "server-only";
import { notFound } from "next/navigation";
import { PayBalanceButton, RefreshWhileWaiting, type ConfirmResult, type PaymentAnswer } from "@repo/booking-ui";
import { getDb, invoices, bookings } from "@repo/db";
import { hashToken } from "@repo/engine";
import type { PropertyCode } from "@repo/sites";
import { and, eq } from "drizzle-orm";
import { guestBooking } from "./booking";
import { InvoiceDocument } from "./invoice";

/*
 * The guest's private booking page, at /booking?ref=<token> on the resort's own
 * site (docs/implementation-plan.md, section 10: booking steps 7 and 8).
 * Anyone with the link sees the booking, so it shows only what the guest
 * already knows. It uses the widget's design tokens, so it looks like the
 * site around it.
 */

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const longDay = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const time = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
function partyWords(party: { adults: number; children: Record<string, number> }) {
  const kids = Object.values(party.children).reduce((sum, n) => sum + n, 0);
  return [plural(party.adults, "adult"), kids ? plural(kids, "child", "children") : ""].filter(Boolean).join(", ");
}

const headline: Record<string, { title: string; line: string }> = {
  pending_payment: { title: "Waiting for your payment", line: "Your booking is held while you pay. If you have paid, this page updates in a moment." },
  part_paid: { title: "You're booked", line: "We have your advance. The balance is due before you arrive." },
  confirmed: { title: "You're booked", line: "Your booking is confirmed and paid. We look forward to having you." },
  checked_in: { title: "Enjoy your stay", line: "You're checked in." },
  checked_out: { title: "Thank you for staying", line: "We hope to see you again." },
  cancelled: { title: "This booking is cancelled", line: "Any refund due goes back the way you paid." },
  no_show: { title: "This booking was marked as a no-show", line: "Please contact the resort if this is wrong." },
  refunded: { title: "Cancelled and refunded", line: "The refund has been sent the way you paid. Banks take 5 to 7 working days to show it." },
  expired: { title: "This booking ran out", line: "The payment wasn't completed in time, so the rooms went back on sale. Nothing was charged." },
};

type Actions = {
  pay: () => Promise<{ ok: true; order: import("@repo/booking-ui").CheckoutOrder } | { ok: false; error: string }>;
  confirm: (answer: PaymentAnswer) => Promise<ConfirmResult>;
  /** Asks Razorpay about a payment still waiting. */
  check: () => Promise<boolean>;
};

export async function GuestBookingPage({ code, token, actions, contact }: { code: PropertyCode; token: string; actions: Actions; contact: { phone?: { href: string; display: string }; whatsapp?: { number: string; display: string } } }) {
  const booking = await guestBooking(code, token);
  if (!booking) notFound();
  const head = headline[booking.status] ?? headline.confirmed;
  const canPay = booking.balancePaise !== null && booking.balancePaise >= 100 && (["part_paid", "confirmed", "checked_in"].includes(booking.status) || (booking.status === "pending_payment" && booking.holdExpiresAt));
  const waiting = booking.status === "pending_payment";
  const card = "rounded-bk border border-bk-line bg-bk-card p-5 sm:p-6";

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-28 text-bk-ink md:pt-36">
      {waiting && <RefreshWhileWaiting check={actions.check} />}
      <p className="text-[0.9rem] text-bk-muted">
        {booking.resort.name} · Booking <span className="font-medium tabular-nums text-bk-ink">{booking.number}</span>
      </p>
      <h1 className="bk-display mt-2 text-[clamp(2rem,5vw,3rem)] leading-tight">{head.title}</h1>
      <p className="mt-3 max-w-xl text-bk-muted">{head.line}</p>

      <section className={`mt-8 ${card}`}>
        <h2 className="bk-display text-[1.3rem]">{booking.checkIn ? "Your stay" : "Your day"}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {booking.checkIn && booking.checkOut ? (
            <>
              <div>
                <dt className="text-[0.85rem] text-bk-muted">Check-in</dt>
                <dd>
                  {longDay(booking.checkIn)}, from {time(booking.resort.checkInTime)}
                </dd>
              </div>
              <div>
                <dt className="text-[0.85rem] text-bk-muted">Check-out</dt>
                <dd>
                  {longDay(booking.checkOut)}, by {time(booking.resort.checkOutTime)}
                </dd>
              </div>
            </>
          ) : (
            booking.visitDate && (
              <div>
                <dt className="text-[0.85rem] text-bk-muted">Date</dt>
                <dd>{longDay(booking.visitDate)}</dd>
              </div>
            )
          )}
        </dl>
        <ul className="mt-5 grid gap-2 border-t border-bk-line pt-4">
          {booking.items.map((item) => (
            <li key={item.id} className="flex flex-wrap justify-between gap-x-4">
              <span>
                {item.title}
                {item.kind !== "addon" && <span className="text-bk-muted"> · {partyWords(item.party)}</span>}
              </span>
              {item.amountPaise !== null && <span className="tabular-nums text-bk-muted">{rupees(item.amountPaise)}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="bk-display text-[1.3rem]">Payment</h2>
        <dl className="mt-4 grid gap-2 text-[0.95rem]">
          {booking.subtotalPaise !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-bk-muted">Price before GST</dt>
              <dd className="tabular-nums">{rupees(booking.subtotalPaise)}</dd>
            </div>
          )}
          {booking.taxPaise !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-bk-muted">GST</dt>
              <dd className="tabular-nums">{rupees(booking.taxPaise)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-bk-line pt-2 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{booking.totalPaise === null ? "To be confirmed" : rupees(booking.totalPaise)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-bk-muted">Paid</dt>
            <dd className="tabular-nums">{rupees(booking.paidPaise)}</dd>
          </div>
          {booking.refundedPaise > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-bk-muted">Refunded</dt>
              <dd className="tabular-nums">{rupees(booking.refundedPaise)}</dd>
            </div>
          )}
          {booking.balancePaise !== null && booking.balancePaise > 0 && !["cancelled", "refunded", "expired", "no_show"].includes(booking.status) && (
            <div className="flex justify-between gap-4 font-medium text-bk-alert">
              <dt>Still to pay</dt>
              <dd className="tabular-nums">{rupees(booking.balancePaise)}</dd>
            </div>
          )}
        </dl>
        {canPay && (
          <div className="mt-5">
            <PayBalanceButton amountPaise={booking.balancePaise!} pay={actions.pay} confirm={actions.confirm} prefill={{ name: booking.guest.name, phone: booking.guest.phone ?? undefined, email: booking.guest.email ?? undefined }} />
          </div>
        )}
        {booking.invoices.length > 0 && (
          <ul className="mt-5 grid gap-1 border-t border-bk-line pt-4 text-[0.9rem]">
            {booking.invoices.map((doc) => (
              <li key={doc.id}>
                <a href={`/booking/invoice?ref=${token}&id=${doc.id}`} className="underline underline-offset-4">
                  {doc.kind === "invoice" ? "GST invoice" : "Credit note"} {doc.number}
                </a>
                <span className="text-bk-muted"> · {rupees(doc.totalPaise)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="bk-display text-[1.3rem]">Need to change something?</h2>
        <p className="mt-2 text-bk-muted">
          To change dates or guests, or to cancel, contact the resort with your booking number, {booking.number}.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {contact.whatsapp && (
            <a
              href={`https://wa.me/${contact.whatsapp.number}?text=${encodeURIComponent(`Hello, about my booking ${booking.number}: `)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-bk-control border border-bk-line px-5 bk-button hover:border-bk-ink"
            >
              WhatsApp {contact.whatsapp.display}
            </a>
          )}
          {contact.phone && (
            <a href={contact.phone.href} className="inline-flex min-h-11 items-center rounded-bk-control border border-bk-line px-5 bk-button hover:border-bk-ink">
              Call {contact.phone.display}
            </a>
          )}
        </div>
        <p className="mt-4 text-[0.85rem] text-bk-muted">Keep this page&apos;s link private: anyone with it can see your booking.</p>
      </section>
    </div>
  );
}

/** An invoice from the guest's booking, by its private link. */
export async function GuestInvoicePage({ code, token, invoiceId }: { code: PropertyCode; token: string; invoiceId: string }) {
  if (!process.env.DATABASE_URL || !/^[\w-]{20,64}$/.test(token) || !/^[0-9a-f-]{36}$/.test(invoiceId)) notFound();
  const db = getDb();
  const [booking] = await db.select({ id: bookings.id, number: bookings.number, propertyId: bookings.propertyId }).from(bookings).where(eq(bookings.manageTokenHash, hashToken(token)));
  if (!booking) notFound();
  const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.bookingId, booking.id)));
  if (!invoice || !invoice.number.startsWith(`${code}/`)) notFound();
  const [against] = invoice.invoiceId ? await db.select({ number: invoices.number }).from(invoices).where(eq(invoices.id, invoice.invoiceId)) : [];
  return (
    <div className="px-4 pb-16 pt-28 md:pt-36">
      <InvoiceDocument invoice={{ ...invoice, bookingNumber: booking.number, againstNumber: against?.number ?? null }} />
      <p className="no-print mx-auto mt-4 max-w-[800px] text-center text-[0.9rem] text-bk-muted">
        <a href={`/booking?ref=${token}`} className="underline underline-offset-4">
          Back to your booking
        </a>{" "}
        · Use your browser&apos;s Print to save it as a PDF.
      </p>
    </div>
  );
}

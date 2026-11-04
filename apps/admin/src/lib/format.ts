import type { BookingSource, BookingStatus, PaymentMethod } from "@repo/engine";

/*
 * How the admin writes money, dates and statuses. Money is whole paise in
 * the database; dates are yyyy-mm-dd; times show in India time.
 */

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** A price, or what to say when a rate is not published yet. */
export const price = (paise: number | null | undefined) => (paise == null ? "Rate to confirm" : rupees(paise));

const asUtc = (date: string) => new Date(`${date}T00:00:00Z`);

/** Such as "Thu 5 Nov". */
export const shortDate = (date: string) => asUtc(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Such as "Thu 5 Nov 2026". */
export const longDate = (date: string) => asUtc(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Such as "5 Nov, 3:45 pm", in India time. */
export const when = (at: Date) => at.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** Such as "3:45 pm", in India time. */
export const clock = (at: Date) => at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export const statusLabel: Record<BookingStatus, string> = {
  pending_payment: "Waiting for payment",
  part_paid: "Part paid",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No-show",
  refunded: "Refunded",
  expired: "Expired",
};

/** Colours for a status: amber waits on someone, green is settled, grey is over. */
export const statusLook: Record<BookingStatus, string> = {
  pending_payment: "bg-warn/10 text-warn",
  part_paid: "bg-warn/10 text-warn",
  confirmed: "bg-good/10 text-good",
  checked_in: "bg-accent text-accent-ink",
  checked_out: "bg-ink/5 text-muted",
  cancelled: "bg-danger/10 text-danger",
  no_show: "bg-danger/10 text-danger",
  refunded: "bg-ink/5 text-muted",
  expired: "bg-ink/5 text-muted",
};

export const sourceLabel: Record<BookingSource, string> = {
  website: "Website",
  admin: "Admin",
  phone: "Phone",
  walk_in: "Walk-in",
  whatsapp: "WhatsApp",
  email: "Email",
  travel_agent: "Travel agent",
  corporate: "Corporate",
  other: "Other",
};

/** The sources staff choose from for an offline booking (ADM-06). */
export const offlineSources = ["phone", "walk_in", "whatsapp", "email", "travel_agent", "corporate", "other"] as const satisfies readonly BookingSource[];

export const methodLabel: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

export type Band = { code: string; label: string };

/** Such as "2 adults, 1 child (5 to 11)". */
export function partyLabel(party: { adults: number; children: Record<string, number> }, bands: readonly Band[]) {
  const parts = [plural(party.adults, "adult")];
  for (const [code, count] of Object.entries(party.children)) {
    if (!count) continue;
    parts.push(`${plural(count, "child", "children")} (${bands.find((b) => b.code === code)?.label ?? code})`);
  }
  return parts.join(", ");
}

/** What is left to pay, or null while the price is to be confirmed. */
export const balance = (booking: { totalPaise: number | null; paidPaise: number }) => (booking.totalPaise === null ? null : Math.max(0, booking.totalPaise - booking.paidPaise));

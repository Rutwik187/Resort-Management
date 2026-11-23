import { and, eq } from "drizzle-orm";
import { messageTemplates, type Executor } from "@repo/db";

/*
 * Message wording staff can change per resort (NOT-01). A template sets a
 * message's subject and the text at its top, with fields in double braces,
 * such as "Dear {{guestName}}, see you on {{checkIn}}." The booking's rows,
 * the button and the footer stay as the code writes them, so a template
 * can never drop the booking number or the link.
 */

export type TemplateKind =
  | "booking_confirmed"
  | "booking_link"
  | "booking_changed"
  | "booking_cancelled"
  | "refund"
  | "pre_arrival"
  | "thank_you"
  | "lead_reply";

/** Each kind of message, in words, with the fields it fills in. */
export const templateKinds: Record<TemplateKind, { label: string; when: string; fields: string[] }> = {
  booking_confirmed: { label: "Booking confirmed", when: "When a booking is paid or confirmed.", fields: ["guestName", "bookingNumber", "resortName", "checkIn", "checkOut", "visitDate", "total", "balance"] },
  booking_link: { label: "Booking page", when: "When staff send the guest their booking page.", fields: ["guestName", "bookingNumber", "resortName", "balance"] },
  booking_changed: { label: "Booking changed", when: "When staff change the dates, rooms or guests.", fields: ["guestName", "bookingNumber", "resortName", "checkIn", "checkOut", "total", "balance"] },
  booking_cancelled: { label: "Booking cancelled", when: "When a booking is cancelled.", fields: ["guestName", "bookingNumber", "resortName"] },
  refund: { label: "Refund", when: "When money goes back to the guest.", fields: ["guestName", "bookingNumber", "resortName", "amount"] },
  pre_arrival: { label: "Before arrival", when: "Two days before check-in or the visit.", fields: ["guestName", "bookingNumber", "resortName", "checkIn", "visitDate", "checkInTime", "phone", "directions"] },
  thank_you: { label: "Thank you", when: "The day after check-out, with the Google review link.", fields: ["guestName", "bookingNumber", "resortName", "reviewLink"] },
  lead_reply: { label: "Enquiry received", when: "When a guest sends an enquiry and gives an email.", fields: ["guestName", "resortName", "phone"] },
};

/** Fills {{field}} with its value; a field with no value becomes empty. */
export function fill(text: string, vars: Record<string, string | null | undefined>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

/**
 * The subject and opening text for a message: the resort's own template
 * when it has an active one, else the code's wording.
 */
export async function wording(
  db: Executor,
  propertyId: string,
  kind: TemplateKind,
  vars: Record<string, string | null | undefined>,
  fallback: { subject: string; intro: string },
): Promise<{ subject: string; intro: string; custom: boolean }> {
  const [template] = await db
    .select()
    .from(messageTemplates)
    .where(and(eq(messageTemplates.propertyId, propertyId), eq(messageTemplates.kind, kind), eq(messageTemplates.channel, "email"), eq(messageTemplates.active, true)));
  if (!template) return { ...fallback, custom: false };
  return { subject: fill(template.subject, vars).trim() || fallback.subject, intro: fill(template.body, vars).trim() || fallback.intro, custom: true };
}

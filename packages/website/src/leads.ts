import "server-only";
import { z } from "zod";
import { getDb } from "@repo/db";
import { recordWebsiteLead } from "@repo/engine";
import type { PropertyCode } from "@repo/sites";

/*
 * Website requests kept as leads in the admin (docs/implementation-plan.md,
 * section 10: forms create leads), besides the WhatsApp message the guest
 * sends. Everything here comes from the public, so it is checked and cut
 * to size first. A request that can't be saved is logged, never shown:
 * WhatsApp already has it.
 */

const day = z.iso.date().optional().catch(undefined);
const text = (max: number) => z.string().trim().max(max);
const amount = z.number().min(0).max(100_000_000);

const bookingRequest = z.object({
  kind: z.enum(["stay", "day"]),
  from: day,
  to: day,
  guests: z.number().int().min(0).max(1000).optional().catch(undefined),
  lines: z.array(z.object({ title: text(160), detail: text(300), amount: amount.nullable() })).max(40),
  total: amount.nullable(),
  guest: z.object({ name: text(80).min(2), phone: text(30).min(6), note: text(1000).catch("") }),
});

/** Each site names its own purposes; these are the admin's kinds of lead. */
const interests: Record<string, "stay" | "day" | "wedding" | "event"> = { stay: "stay", group: "stay", day: "day", school: "day", picnic: "day", wedding: "wedding", event: "event", corporate: "event" };

const enquiry = z.object({
  purpose: text(40).catch(""),
  name: text(80).min(2),
  phone: text(30).min(6),
  email: z.email().optional().catch(undefined),
  date: day,
  guests: z.coerce.number().int().min(1).max(5000).optional().catch(undefined),
  /** The whole message the guest sent on WhatsApp, so nothing the form asked for is lost. */
  note: text(4000).optional().catch(undefined),
});

/** What the booking widget sent on WhatsApp, as a lead. */
export async function saveBookingRequest(code: PropertyCode, input: unknown) {
  const parsed = bookingRequest.safeParse(input);
  if (!parsed.success || !process.env.DATABASE_URL) return;
  const request = parsed.data;
  try {
    await recordWebsiteLead(getDb(), {
      propertyCode: code,
      source: "website_booking",
      interest: request.kind,
      name: request.guest.name,
      phone: request.guest.phone,
      dateFrom: request.from,
      dateTo: request.kind === "stay" ? request.to : undefined,
      guests: request.guests,
      message: request.guest.note || undefined,
      request: { lines: request.lines, total: request.total },
    });
  } catch (error) {
    console.error(`A ${code} booking request wasn't saved as a lead.`, error);
  }
}

/** What the enquiry form sent on WhatsApp, as a lead. */
export async function saveEnquiry(code: PropertyCode, input: unknown) {
  const parsed = enquiry.safeParse(input);
  if (!parsed.success || !process.env.DATABASE_URL) return;
  const form = parsed.data;
  try {
    await recordWebsiteLead(getDb(), {
      propertyCode: code,
      source: "website_enquiry",
      interest: interests[form.purpose] ?? "other",
      name: form.name,
      phone: form.phone,
      email: form.email,
      dateFrom: form.date,
      guests: form.guests,
      message: form.note,
    });
  } catch (error) {
    console.error(`A ${code} enquiry wasn't saved as a lead.`, error);
  }
}

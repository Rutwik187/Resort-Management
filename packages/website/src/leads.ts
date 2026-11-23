import "server-only";
import { z } from "zod";
import { getDb } from "@repo/db";
import { headers } from "next/headers";
import { recordWebsiteLead, takeRequest } from "@repo/engine";
import { sendMetaEvent } from "./meta";
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
const interests: Record<string, "stay" | "day" | "wedding" | "corporate" | "event"> = { stay: "stay", group: "stay", day: "day", school: "day", picnic: "day", wedding: "wedding", event: "event", corporate: "corporate" };

const consent = z.object({ version: z.string().max(20), marketing: z.boolean(), at: z.string().max(40), eventId: z.string().max(60).optional() }).optional().catch(undefined);
const campaign = z
  .partialRecord(z.enum(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "landing", "referrer"]), z.string().max(300))
  .optional()
  .catch(undefined);

const enquiry = z.object({
  purpose: text(40).catch(""),
  name: text(80).min(2),
  phone: text(30).min(6),
  email: z.email().optional().catch(undefined),
  date: day,
  guests: z.coerce.number().int().min(1).max(5000).optional().catch(undefined),
  /** The whole message the guest sent on WhatsApp, so nothing the form asked for is lost. */
  note: text(4000).optional().catch(undefined),
  consent,
  campaign,
});

/** The visitor's IP address, as Vercel passes it on. */
export async function visitorIp() {
  const head = await headers();
  return head.get("x-real-ip") ?? head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Whether this visitor may send another of these now (SEC-04). A limit that can't be checked lets the request through. */
export async function withinLimit(kind: string, code: string, limit: number, windowSeconds: number) {
  try {
    return await takeRequest(getDb(), `${kind}:${code}:${await visitorIp()}`, limit, windowSeconds);
  } catch (error) {
    console.error("The rate limit couldn't be checked.", error);
    return true;
  }
}

/** What the booking widget sent on WhatsApp, as a lead. */
export async function saveBookingRequest(code: PropertyCode, input: unknown) {
  const parsed = bookingRequest.safeParse(input);
  if (!parsed.success || !process.env.DATABASE_URL) return;
  if (!(await withinLimit("request", code, 10, 600))) return;
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
  if (!(await withinLimit("enquiry", code, 5, 600))) return;
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
      consent: form.consent ? { version: form.consent.version, marketing: form.consent.marketing, at: form.consent.at } : undefined,
      campaign: form.campaign,
    });
    if (form.consent?.marketing) await sendMetaEvent({ name: "Lead", eventId: form.consent.eventId ?? `lead-${code}-${Date.now()}`, phone: form.phone, email: form.email, category: form.purpose });
  } catch (error) {
    console.error(`A ${code} enquiry wasn't saved as a lead.`, error);
  }
}

const corporate = z.object({
  property: z.enum(["KS", "GC", "SB", "PV"]).catch("KS"),
  company: text(160).min(2),
  gstin: text(15).catch(""),
  name: text(80).min(2),
  designation: text(80).catch(""),
  phone: text(30).min(6),
  email: z.union([z.email().max(160), z.literal("")]).catch(""),
  dateFrom: day,
  dateTo: day,
  guests: z.coerce.number().int().min(1).max(5000).optional().catch(undefined),
  rooms: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
  stay: z.enum(["day", "overnight"]).catch("overnight"),
  meals: text(80).catch(""),
  meeting: text(300).catch(""),
  budget: text(80).catch(""),
  note: text(2000).catch(""),
  consent: z.object({ version: z.string().max(20), marketing: z.boolean(), at: z.string().max(40), eventId: z.string().max(60).optional() }),
  campaign,
});

/**
 * A corporate enquiry (CRP-02, CRP-05), saved as a Corporate lead at the
 * resort the guest chose. Returns whether it was saved, so the form can
 * offer WhatsApp when it wasn't.
 */
export async function saveCorporateEnquiry(siteCode: PropertyCode | "GROUP", input: unknown): Promise<{ ok: boolean }> {
  const parsed = corporate.safeParse(input);
  if (!parsed.success || !process.env.DATABASE_URL) return { ok: false };
  if (!(await withinLimit("corporate", siteCode, 5, 600))) return { ok: false };
  const form = parsed.data;
  const details: Record<string, string> = Object.fromEntries(
    Object.entries({
      Company: form.company,
      GSTIN: form.gstin,
      Designation: form.designation,
      "Day or overnight": form.stay === "day" ? "Day event" : "Overnight",
      "Rooms needed": form.rooms ? String(form.rooms) : "",
      Meals: form.meals,
      "Meeting and AV": form.meeting,
      "Asked from": siteCode === form.property ? "" : siteCode === "GROUP" ? "The group website" : `The ${siteCode} website`,
    }).filter(([, value]) => value),
  );
  try {
    await recordWebsiteLead(getDb(), {
      propertyCode: form.property,
      source: "website_enquiry",
      interest: "corporate",
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      dateFrom: form.dateFrom,
      dateTo: form.stay === "overnight" ? form.dateTo : undefined,
      guests: form.guests,
      message: form.note || undefined,
      details,
      budget: form.budget || undefined,
      consent: { version: form.consent.version, marketing: form.consent.marketing, at: form.consent.at },
      campaign: form.campaign,
    });
    if (form.consent.marketing) await sendMetaEvent({ name: "Lead", eventId: form.consent.eventId ?? `lead-${siteCode}-${Date.now()}`, phone: form.phone, email: form.email || undefined, category: "corporate" });
    return { ok: true };
  } catch (error) {
    console.error(`A corporate enquiry from ${siteCode} wasn't saved as a lead.`, error);
    return { ok: false };
  }
}

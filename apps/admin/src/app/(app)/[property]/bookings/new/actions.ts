"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, leadActivities, leads, offers, properties } from "@repo/db";
import { createBooking, holdSeats, holdStay, nightsOf, offerDiscount, offerProblem, quoteSeats, quoteStay, releaseHold, type Quote } from "@repo/engine";
import { offlineSources } from "@/lib/format";
import { checkbox, date, filled, problem, rupeesField, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";

const count = z.number().int().min(0).max(50);
const party = { adults: count.min(1, "Each room or ticket needs at least one adult."), children: z.record(z.string().max(40), count) };
const request = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("stay"),
    checkIn: date("check-in date"),
    checkOut: date("check-out date"),
    lines: z.array(z.object({ id: z.uuid(), ...party, extraBeds: count.max(5) })).min(1, "Add at least one room.").max(30),
  }),
  z.object({
    kind: z.literal("day"),
    day: date("date"),
    lines: z.array(z.object({ id: z.uuid(), ...party })).min(1, "Add at least one ticket.").max(30),
  }),
]);
export type BookingRequest = z.input<typeof request>;

/** What the price check shows: each room or ticket, and the total. */
export type QuoteView = {
  error?: string;
  lines?: { name: string; totalPaise: number | null; nights: { night: string; paise: number | null; source: string }[] }[];
  totalPaise?: number | null;
};

const asView = (quote: Quote): QuoteView => ({
  lines: quote.lines.map((line) =>
    line.kind === "stay"
      ? { name: line.roomTypeName, totalPaise: line.totalPaise, nights: line.nights }
      : { name: `${line.offeringName}, ${line.slotLabel}`, totalPaise: line.totalPaise, nights: [] },
  ),
  totalPaise: quote.totalPaise,
});

/** Prices the rooms or tickets as the engine would book them, and keeps nothing. */
export async function quoteOffline(propertyId: string, payload: BookingRequest): Promise<QuoteView> {
  try {
    z.uuid().parse(propertyId);
    await requirePermission("bookings.create", propertyId);
    const input = request.parse(payload);
    const db = getDb();
    const quote =
      input.kind === "stay"
        ? await quoteStay(db, { propertyId, checkIn: input.checkIn, checkOut: input.checkOut, rooms: input.lines.map(({ id, adults, children, extraBeds }) => ({ roomTypeId: id, party: { adults, children }, extraBeds })) })
        : await quoteSeats(db, { propertyId, day: input.day, seats: input.lines.map(({ id, adults, children }) => ({ slotId: id, party: { adults, children } })) });
    return asView(quote);
  } catch (error) {
    return { error: problem(error, "Your role can't make bookings at this resort.")?.error };
  }
}

const methods = ["cash", "upi", "card", "bank_transfer", "cheque", "other"] as const;
const details = z
  .object({
    name: z.string().trim().min(2, "Add the guest's name.").max(120),
    phone: z
      .string()
      .transform((value) => value.replace(/\D/g, ""))
      .pipe(z.string().min(10, "Write the phone number with its 10 digits.").max(15, "That phone number is too long."))
      .optional(),
    email: z.email("Check the email address.").optional(),
    companyName: z.string().trim().max(160).optional(),
    companyGstin: z
      .string()
      .trim()
      .regex(/^[0-9A-Za-z]{15}$/, "A GSTIN has 15 letters and numbers.")
      .optional(),
    source: z.enum(offlineSources, { error: "Choose where the booking came from." }),
    notes: z.string().trim().max(2000).optional(),
    override: checkbox,
    overridePrice: rupeesField("Price").optional(),
    overrideReason: z.string().trim().max(500).optional(),
    payMethod: z.enum(methods, { error: "Choose how the guest paid." }).optional(),
    payAmount: rupeesField("Amount paid").optional(),
    payReference: z.string().trim().max(100).optional(),
    /** The lead this booking comes from, which it marks as booked. */
    leadId: z.uuid().optional(),
    /** An offer or coupon. The server works out what it takes off. */
    offerId: z.uuid().optional(),
  })
  .refine((v) => !v.override || v.overridePrice !== undefined, { error: "Write the price you agreed." })
  .refine((v) => !v.override || (v.overrideReason?.length ?? 0) >= 3, { error: "Say why the price is different." })
  .refine((v) => !v.payMethod || v.payAmount !== undefined, { error: "Write how much the guest paid." })
  .refine((v) => v.payMethod || v.payAmount === undefined, { error: "Choose how the guest paid." })
  .refine((v) => !(v.override && v.offerId), { error: "Choose an offer or a price set by hand, not both." });

/**
 * Books for a walk-in, phone, WhatsApp, travel agent or corporate guest
 * through the same engine as the website (ADM-06): hold, then book. A price
 * set by hand needs a reason and the prices permission (ADM-07). A payment
 * taken now is recorded with the booking.
 */
export async function createOffline(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  let path: string;
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("bookings.create", propertyId);
    const input = request.parse(JSON.parse(String(form.get("request") ?? "{}")));
    const guest = details.parse(filled(form));
    if (guest.override) await requirePermission("prices.manage", propertyId);
    if (guest.payMethod) await requirePermission("bookings.modify", propertyId);

    const db = getDb();
    // An offer must cover these dates before anything is held.
    const [offer] = guest.offerId ? await db.select().from(offers).where(and(eq(offers.id, guest.offerId), eq(offers.propertyId, propertyId))) : [];
    if (guest.offerId && !offer) return { error: "That offer no longer exists." };
    if (offer) {
      const why = offerProblem(offer, input.kind === "stay" ? { kind: "stay", from: input.checkIn, to: input.checkOut, nights: nightsOf(input.checkIn, input.checkOut).length } : { kind: "day", from: input.day });
      if (why) return { error: why };
    }
    const hold =
      input.kind === "stay"
        ? await holdStay(db, { propertyId, checkIn: input.checkIn, checkOut: input.checkOut, rooms: input.lines.map(({ id, adults, children, extraBeds }) => ({ roomTypeId: id, party: { adults, children }, extraBeds })) })
        : await holdSeats(db, { propertyId, day: input.day, seats: input.lines.map(({ id, adults, children }) => ({ slotId: id, party: { adults, children } })) });

    const offerName = offer ? `Offer: ${offer.title}${offer.code ? ` (${offer.code})` : ""}` : null;
    if (offer && offer.discountKind !== "none" && hold.quote.totalPaise === null) {
      await releaseHold(db, hold.holdId);
      return { error: "This booking has no price yet, so the offer has nothing to take off. Book without it and set the price on the booking." };
    }
    const priceOverride = guest.override
      ? { totalPaise: guest.overridePrice!, reason: guest.overrideReason! }
      : offer && offer.discountKind !== "none"
        ? { totalPaise: hold.quote.totalPaise! - offerDiscount(offer, hold.quote.totalPaise!), reason: offerName! }
        : undefined;
    const payment = guest.payMethod ? { method: guest.payMethod, amountPaise: guest.payAmount!, reference: guest.payReference } : undefined;
    let made: { bookingId: string; number: string };
    try {
      made = await createBooking(db, {
        holdId: hold.holdId,
        guest: { name: guest.name, phone: guest.phone, email: guest.email, companyName: guest.companyName, companyGstin: guest.companyGstin },
        source: guest.source,
        // An offer that takes nothing off by itself is noted for the team.
        notes: offer && offer.discountKind === "none" ? [guest.notes, offerName].filter(Boolean).join("\n") : guest.notes,
        userId: staff.userId,
        priceOverride,
        payment,
      });
    } catch (error) {
      // Nothing was booked, so the rooms or seats go straight back.
      await releaseHold(db, hold.holdId);
      throw error;
    }

    await audit({ userId: staff.userId, propertyId, action: "booking.create", entity: "bookings", entityId: made.bookingId, after: { number: made.number, source: guest.source, quote: hold.quote, priceOverride, payment } });
    if (guest.leadId) {
      // The lead it came from is booked now, with the booking on its timeline.
      const [won] = await db
        .update(leads)
        .set({ status: "won", bookingId: made.bookingId })
        .where(and(eq(leads.id, guest.leadId), eq(leads.propertyId, propertyId)))
        .returning({ id: leads.id });
      if (won) {
        await db.insert(leadActivities).values({ leadId: won.id, userId: staff.userId, type: "booked", data: { number: made.number, bookingId: made.bookingId } });
        await audit({ userId: staff.userId, propertyId, action: "lead.booked", entity: "leads", entityId: won.id, after: { number: made.number } });
      }
    }
    const [property] = await db.select({ code: properties.code }).from(properties).where(eq(properties.id, propertyId));
    path = `/${property.code.toLowerCase()}/bookings/${made.number.toLowerCase()}`;
  } catch (error) {
    if (error instanceof SyntaxError) return { error: "Add at least one room or ticket." };
    return problem(error, "Your role can't do this at this resort.");
  }
  redirect(path);
}

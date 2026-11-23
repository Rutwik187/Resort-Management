"use server";

import { and, count, eq, gte, inArray, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, offerDays, offerings, offers, offerUses, roomTypes } from "@repo/db";
import { NotFoundError, RuleError, todayInIndia } from "@repo/engine";
import { checkbox, date, filled, problem, rupeesField, wholeNumber, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";
import { websiteChanged } from "@/lib/website";

const offerInput = z
  .object({
    title: z.string().trim().min(3, "Give the offer a title, such as Monsoon weekdays.").max(120),
    details: z.string().trim().max(500).optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9-]{2,19}$/, "A code has 3 to 20 letters, numbers and dashes, such as MONSOON10.")
      .optional(),
    discountKind: z.enum(["percent", "amount", "none"]),
    percent: wholeNumber("The percentage", 1, 100).optional(),
    amount: rupeesField("The amount off").optional(),
    appliesTo: z.enum(["stay", "day", "any"]),
    startsOn: date("first day").optional(),
    endsOn: date("last day").optional(),
    minNights: wholeNumber("The fewest nights", 1, 60).optional(),
    onWebsite: checkbox,
    active: checkbox,
    kind: z.enum(["standard", "early_bird", "last_minute", "long_stay", "festival"]).default("standard"),
    bookFrom: date("first booking day").optional(),
    bookTo: date("last booking day").optional(),
    minDaysAhead: wholeNumber("Days ahead, at least", 1, 365).optional(),
    maxDaysAhead: wholeNumber("Days ahead, at most", 0, 365).optional(),
    freeNights: wholeNumber("Free nights", 1, 30).optional(),
    maxUses: wholeNumber("The most uses", 1, 100000).optional(),
    maxUsesPerGuest: wholeNumber("The most uses for one guest", 1, 1000).optional(),
    minAmount: rupeesField("The least booking amount").optional(),
    showCode: checkbox,
  })
  .refine((v) => v.discountKind !== "percent" || v.percent !== undefined, { message: "Write the percentage off." })
  .refine((v) => v.discountKind !== "amount" || (v.amount !== undefined && v.amount > 0), { message: "Write the amount off, in rupees." })
  .refine((v) => !v.startsOn || !v.endsOn || v.endsOn >= v.startsOn, { message: "The last day can't be before the first." })
  .refine((v) => !v.bookFrom || !v.bookTo || v.bookTo >= v.bookFrom, { message: "The last booking day can't be before the first." })
  .refine((v) => v.minDaysAhead === undefined || v.maxDaysAhead === undefined || v.maxDaysAhead >= v.minDaysAhead, { message: "Days ahead: the most can't be below the least." })
  .refine((v) => !v.freeNights || !v.minNights || v.freeNights < v.minNights, { message: "Free nights must be fewer than the fewest nights." });

const ids = (form: FormData, name: string) => z.array(z.uuid()).max(200).parse(form.getAll(name).filter((v) => v !== ""));
const weekdays = (form: FormData) => z.array(z.coerce.number().int().min(0).max(6)).max(7).parse(form.getAll("weekdays"));

/** Adds an offer or coupon, or changes one (offerId set). */
export async function saveOffer(propertyId: string, offerId: string | null, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("prices.manage", propertyId);
    const fields = filled(form);
    delete fields.weekdays;
    delete fields.roomTypeIds;
    delete fields.offeringIds;
    const input = offerInput.parse(fields);
    const days = weekdays(form);
    const typeIds = ids(form, "roomTypeIds");
    const passIds = ids(form, "offeringIds");
    const db = getDb();
    // Only this resort's rooms and packages.
    if (typeIds.length) {
      const own = await db.select({ id: roomTypes.id }).from(roomTypes).where(and(eq(roomTypes.propertyId, propertyId), inArray(roomTypes.id, typeIds)));
      if (own.length !== typeIds.length) return { error: "One of those rooms isn't at this resort." };
    }
    if (passIds.length) {
      const own = await db.select({ id: offerings.id }).from(offerings).where(and(eq(offerings.propertyId, propertyId), inArray(offerings.id, passIds)));
      if (own.length !== passIds.length) return { error: "One of those packages isn't at this resort." };
    }
    if (input.code) {
      const [taken] = await db
        .select({ id: offers.id })
        .from(offers)
        .where(and(eq(offers.propertyId, propertyId), eq(offers.code, input.code), offerId ? ne(offers.id, offerId) : undefined));
      if (taken) return { error: `Another offer here uses the code ${input.code}.` };
    }
    const values = {
      title: input.title,
      details: input.details ?? null,
      code: input.code ?? null,
      discountKind: input.discountKind,
      discountValue: input.discountKind === "percent" ? input.percent! : input.discountKind === "amount" ? input.amount! : null,
      appliesTo: input.appliesTo,
      startsOn: input.startsOn ?? null,
      endsOn: input.endsOn ?? null,
      minNights: input.appliesTo === "day" ? null : (input.minNights ?? null),
      onWebsite: input.onWebsite,
      active: input.active,
      kind: input.kind,
      bookFrom: input.bookFrom ?? null,
      bookTo: input.bookTo ?? null,
      minDaysAhead: input.minDaysAhead ?? null,
      maxDaysAhead: input.maxDaysAhead ?? null,
      // Every day ticked is the same as none.
      weekdays: days.length && days.length < 7 ? [...new Set(days)].sort() : null,
      roomTypeIds: input.appliesTo === "day" ? [] : typeIds,
      offeringIds: input.appliesTo === "stay" ? [] : passIds,
      freeNights: input.appliesTo === "day" ? null : (input.freeNights ?? null),
      maxUses: input.maxUses ?? null,
      maxUsesPerGuest: input.maxUsesPerGuest ?? null,
      minAmountPaise: input.minAmount ?? null,
      showCode: Boolean(input.code) && input.showCode,
    };
    if (offerId) {
      z.uuid().parse(offerId);
      const [before] = await db.select().from(offers).where(and(eq(offers.id, offerId), eq(offers.propertyId, propertyId)));
      if (!before) throw new NotFoundError("That offer no longer exists.");
      const [after] = await db.update(offers).set(values).where(eq(offers.id, offerId)).returning();
      await audit({ userId: staff.userId, propertyId, action: "offer.update", entity: "offers", entityId: offerId, before, after });
    } else {
      const [created] = await db.insert(offers).values({ propertyId, ...values, createdBy: staff.userId }).returning();
      await audit({ userId: staff.userId, propertyId, action: "offer.create", entity: "offers", entityId: created.id, after: created });
    }
    websiteChanged(propertyId);
    refresh();
    return { done: offerId ? "Offer saved." : `${input.title} added.` };
  } catch (error) {
    return problem(error, "Your role can't change offers at this resort.");
  }
}

/** Turns an offer on or off, everywhere at once. */
export async function setOfferActive(offerId: string, active: boolean): Promise<FormState> {
  try {
    z.uuid().parse(offerId);
    const db = getDb();
    const [offer] = await db.select().from(offers).where(eq(offers.id, offerId));
    if (!offer) throw new NotFoundError("That offer no longer exists.");
    const staff = await requirePermission("prices.manage", offer.propertyId);
    await db.update(offers).set({ active: Boolean(active) }).where(eq(offers.id, offerId));
    await audit({ userId: staff.userId, propertyId: offer.propertyId, action: "offer.active", entity: "offers", entityId: offerId, before: { active: offer.active }, after: { active: Boolean(active) } });
    websiteChanged(offer.propertyId);
    refresh();
    return { done: active ? `${offer.title} is on.` : `${offer.title} is off.` };
  } catch (error) {
    return problem(error, "Your role can't change offers at this resort.");
  }
}

/** Removes an offer. Bookings that used it keep their price and the offer's name in their reason. */
export async function deleteOffer(offerId: string): Promise<FormState> {
  try {
    z.uuid().parse(offerId);
    const db = getDb();
    const [offer] = await db.select().from(offers).where(eq(offers.id, offerId));
    if (!offer) throw new NotFoundError("That offer no longer exists.");
    const staff = await requirePermission("prices.manage", offer.propertyId);
    const [{ n }] = await db.select({ n: count() }).from(offerUses).where(eq(offerUses.offerId, offerId));
    if (n > 0) throw new RuleError(`${offer.title} has been used by ${n === 1 ? "a booking" : `${n} bookings`}, so it stays for the reports. Turn it off instead.`);
    await db.delete(offerDays).where(eq(offerDays.offerId, offerId));
    await db.delete(offers).where(eq(offers.id, offerId));
    await audit({ userId: staff.userId, propertyId: offer.propertyId, action: "offer.delete", entity: "offers", entityId: offerId, before: offer });
    websiteChanged(offer.propertyId);
    refresh();
    return { done: "Offer removed." };
  } catch (error) {
    return problem(error, "Your role can't change offers at this resort.");
  }
}

const dayInput = z.object({
  day: date("day"),
  offerId: z.uuid({ error: "Choose the offer." }),
  quantity: wholeNumber("The most bookings", 1, 10000).optional(),
});

/** Schedules the Offer of the Day for a date, or replaces that date's (OFR-01). */
export async function scheduleOfferDay(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("prices.manage", propertyId);
    const input = dayInput.parse(filled(form));
    if (input.day < todayInIndia()) return { error: "Choose today or a later day." };
    const db = getDb();
    const [offer] = await db.select().from(offers).where(and(eq(offers.id, input.offerId), eq(offers.propertyId, propertyId)));
    if (!offer) throw new NotFoundError("That offer no longer exists.");
    if (offer.discountKind === "none" && !offer.freeNights) return { error: "The Offer of the Day must take something off by itself. Choose an offer with a percentage, an amount or free nights." };
    const [before] = await db.select().from(offerDays).where(and(eq(offerDays.propertyId, propertyId), eq(offerDays.day, input.day)));
    const [after] = await db
      .insert(offerDays)
      .values({ propertyId, day: input.day, offerId: offer.id, quantity: input.quantity ?? null, createdBy: staff.userId })
      .onConflictDoUpdate({ target: [offerDays.propertyId, offerDays.day], set: { offerId: offer.id, quantity: input.quantity ?? null } })
      .returning();
    await audit({ userId: staff.userId, propertyId, action: "offer_day.set", entity: "offer_days", entityId: after.id, before: before ?? null, after });
    websiteChanged(propertyId);
    refresh();
    return { done: `${offer.title} is the Offer of the Day on ${input.day}.` };
  } catch (error) {
    return problem(error, "Your role can't change offers at this resort.");
  }
}

/** Takes the Offer of the Day off a date that hasn't passed. */
export async function removeOfferDay(dayId: string): Promise<FormState> {
  try {
    z.uuid().parse(dayId);
    const db = getDb();
    const [row] = await db.select().from(offerDays).where(and(eq(offerDays.id, dayId), gte(offerDays.day, todayInIndia())));
    if (!row) throw new NotFoundError("That day's offer");
    const staff = await requirePermission("prices.manage", row.propertyId);
    await db.delete(offerDays).where(eq(offerDays.id, dayId));
    await audit({ userId: staff.userId, propertyId: row.propertyId, action: "offer_day.remove", entity: "offer_days", entityId: dayId, before: row });
    websiteChanged(row.propertyId);
    refresh();
    return { done: "Removed from that day." };
  } catch (error) {
    return problem(error, "Your role can't change offers at this resort.");
  }
}

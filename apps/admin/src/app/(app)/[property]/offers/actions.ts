"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, offers } from "@repo/db";
import { NotFoundError } from "@repo/engine";
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
  })
  .refine((v) => v.discountKind !== "percent" || v.percent !== undefined, { message: "Write the percentage off." })
  .refine((v) => v.discountKind !== "amount" || (v.amount !== undefined && v.amount > 0), { message: "Write the amount off, in rupees." })
  .refine((v) => !v.startsOn || !v.endsOn || v.endsOn >= v.startsOn, { message: "The last day can't be before the first." });

/** Adds an offer or coupon, or changes one (offerId set). */
export async function saveOffer(propertyId: string, offerId: string | null, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("prices.manage", propertyId);
    const input = offerInput.parse(filled(form));
    const db = getDb();
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
    await db.delete(offers).where(eq(offers.id, offerId));
    await audit({ userId: staff.userId, propertyId: offer.propertyId, action: "offer.delete", entity: "offers", entityId: offerId, before: offer });
    websiteChanged(offer.propertyId);
    refresh();
    return { done: "Offer removed." };
  } catch (error) {
    return problem(error, "Your role can't change offers at this resort.");
  }
}

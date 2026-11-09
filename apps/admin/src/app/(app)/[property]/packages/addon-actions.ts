"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { addons, getDb } from "@repo/db";
import { NotFoundError, RuleError } from "@repo/engine";
import { checkbox, filled, problem, rupeesField, wholeNumber, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";
import { websiteChanged } from "@/lib/website";

/*
 * Add-ons (PR-06): meals, a barbecue, decoration, activity tickets and the
 * like, priced per unit, per person or per night. Guests add them on the
 * website before paying; staff add them to bookings made at the desk.
 */

const id = z.uuid({ error: "That no longer exists." });
const forbidden = "Your role can't change add-ons at this resort.";

const addonInput = z
  .object({
    name: z.string().trim().min(2, "Name it, such as Barbecue dinner.").max(80),
    summary: z.string().trim().max(300).optional(),
    basis: z.enum(["unit", "person", "night"], { error: "Choose how it is priced." }),
    soldWith: z.enum(["stay", "day", "both"], { error: "Choose what it is sold with." }),
    price: rupeesField("Price"),
    maxQuantity: wholeNumber("Most in one booking", 1, 100),
  })
  .refine((v) => v.basis !== "night" || v.soldWith === "stay", { error: "A per-night add-on is only for stays. Choose Stays, or price it per unit or per person." });

const code = z
  .string({ error: "Give it a code." })
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The code uses small letters, numbers and dashes, such as bbq-dinner.");

async function addonOf(addonId: string) {
  id.parse(addonId);
  const [addon] = await getDb().select().from(addons).where(eq(addons.id, addonId));
  if (!addon) throw new NotFoundError("Add-on");
  return addon;
}

export async function createAddon(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(propertyId);
    const staff = await requirePermission("prices.manage", propertyId);
    const fields = filled(form);
    const input = addonInput.parse(fields);
    const [created] = await getDb()
      .insert(addons)
      .values({
        propertyId,
        code: code.parse(fields.code),
        name: input.name,
        summary: input.summary ?? null,
        basis: input.basis,
        soldWith: input.soldWith,
        pricePaise: input.price,
        maxQuantity: input.maxQuantity,
        onWebsite: checkbox.parse(fields.onWebsite),
        createdBy: staff.userId,
      })
      .onConflictDoNothing({ target: [addons.propertyId, addons.code] })
      .returning();
    if (!created) throw new RuleError(`This resort already has an add-on with the code ${fields.code}.`);
    await audit({ userId: staff.userId, propertyId, action: "addon.create", entity: "addons", entityId: created.id, after: created });
    websiteChanged(propertyId);
    refresh();
    return { done: `${created.name} added.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Changes an add-on. Bookings already made keep the price they were made at. */
export async function updateAddon(addonId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const before = await addonOf(addonId);
    const staff = await requirePermission("prices.manage", before.propertyId);
    const fields = filled(form);
    const input = addonInput.parse(fields);
    const [after] = await getDb()
      .update(addons)
      .set({
        name: input.name,
        summary: input.summary ?? null,
        basis: input.basis,
        soldWith: input.soldWith,
        pricePaise: input.price,
        maxQuantity: input.maxQuantity,
        onWebsite: checkbox.parse(fields.onWebsite),
      })
      .where(eq(addons.id, addonId))
      .returning();
    await audit({ userId: staff.userId, propertyId: before.propertyId, action: "addon.update", entity: "addons", entityId: addonId, before, after });
    websiteChanged(before.propertyId);
    refresh();
    return { done: "Saved. Bookings already made keep their price." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Puts an add-on on sale or takes it off. */
export async function setAddonActive(addonId: string, active: boolean): Promise<FormState> {
  try {
    const before = await addonOf(addonId);
    const staff = await requirePermission("prices.manage", before.propertyId);
    await getDb().update(addons).set({ active: Boolean(active) }).where(eq(addons.id, addonId));
    await audit({ userId: staff.userId, propertyId: before.propertyId, action: "addon.active", entity: "addons", entityId: addonId, before: { active: before.active }, after: { active: Boolean(active) } });
    websiteChanged(before.propertyId);
    refresh();
    return { done: active ? `${before.name} is on sale.` : `${before.name} is off sale.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

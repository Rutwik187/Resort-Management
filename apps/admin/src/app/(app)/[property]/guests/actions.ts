"use server";

import { eq, inArray, or, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, guestProfiles, guests, leads } from "@repo/db";
import { NotFoundError } from "@repo/engine";
import { checkbox, filled, problem, type FormState } from "@/lib/forms";
import { profileKey } from "@/lib/guests";
import { audit, requirePermission } from "@/lib/staff";

/** A guest row, and the resort it was opened from, to check the person's role there. */
async function guestAt(guestId: string, propertyId: string) {
  z.uuid().parse(guestId);
  z.uuid().parse(propertyId);
  const [row] = await getDb().select().from(guests).where(eq(guests.id, guestId));
  if (!row) throw new NotFoundError("That guest no longer exists.");
  return row;
}

const profileInput = z.object({
  tags: z
    .string()
    .optional()
    .transform((text) =>
      [...new Set((text ?? "").split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 12),
    )
    .pipe(z.array(z.string().max(30, "Keep each tag to 30 characters."))),
  note: z.string().trim().max(2000).optional(),
  marketingConsent: checkbox,
});

/** Tags, a note and marketing consent for a guest, across all their bookings. */
export async function saveGuestProfile(guestId: string, propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const row = await guestAt(guestId, propertyId);
    const staff = await requirePermission("bookings.modify", propertyId);
    const input = profileInput.parse(filled(form));
    const key = profileKey(row);
    const db = getDb();
    const [before] = await db.select().from(guestProfiles).where(eq(guestProfiles.key, key));
    await db
      .insert(guestProfiles)
      .values({ key, tags: input.tags, note: input.note ?? null, marketingConsent: input.marketingConsent, updatedBy: staff.userId })
      .onConflictDoUpdate({ target: guestProfiles.key, set: { tags: input.tags, note: input.note ?? null, marketingConsent: input.marketingConsent, updatedBy: staff.userId, updatedAt: new Date() } });
    await audit({ userId: staff.userId, propertyId, action: "guest.profile", entity: "guest_profiles", entityId: key, before: before ?? null, after: input });
    refresh();
    return { done: "Saved." };
  } catch (error) {
    return problem(error, "Your role can't change guests at this resort.");
  }
}

/**
 * Removes a guest's personal details on their request (the DPDP Act, plan
 * section 14): their name, phone, email and company on every booking and
 * lead. The bookings and their money stay, because tax law keeps them.
 */
export async function removeGuestDetails(guestId: string, propertyId: string): Promise<FormState> {
  try {
    const row = await guestAt(guestId, propertyId);
    const staff = await requirePermission("settings.manage", propertyId);
    const key = profileKey(row);
    const db = getDb();
    await db.transaction(async (tx) => {
      const same = row.phone ? eq(guests.phone, row.phone) : row.email ? sql`lower(${guests.email}) = ${row.email.toLowerCase()}` : eq(guests.id, row.id);
      const ids = (await tx.select({ id: guests.id }).from(guests).where(same)).map((g) => g.id);
      await tx.update(guests).set({ name: "Removed guest", phone: null, email: null, companyName: null, companyGstin: null }).where(inArray(guests.id, ids));
      const theirLeads = [row.phone ? eq(leads.phone, row.phone) : undefined, row.email ? sql`lower(${leads.email}) = ${row.email.toLowerCase()}` : undefined].filter((c) => c !== undefined);
      if (theirLeads.length) await tx.update(leads).set({ name: "Removed guest", phone: null, email: null, message: null, request: null }).where(or(...theirLeads));
      await tx
        .insert(guestProfiles)
        .values({ key, tags: [], note: null, marketingConsent: false, removedAt: new Date(), updatedBy: staff.userId })
        .onConflictDoUpdate({ target: guestProfiles.key, set: { tags: [], note: null, marketingConsent: false, removedAt: new Date(), updatedBy: staff.userId, updatedAt: new Date() } });
    });
    // The audit keeps which guest, not their details.
    await audit({ userId: staff.userId, propertyId, action: "guest.remove", entity: "guests", entityId: guestId });
    refresh();
    return { done: "Their personal details are removed. Their bookings stay, without them." };
  } catch (error) {
    return problem(error, "Only a Super Admin can remove a guest's details.");
  }
}

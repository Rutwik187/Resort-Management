"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, properties } from "@repo/db";
import { filled, problem, wholeNumber, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";

const time = (label: string) => z.string({ error: `Set the ${label}.` }).regex(/^\d{2}:\d{2}$/, `Write the ${label} as hh:mm.`);
const settingsInput = z.object({
  legalName: z.string().trim().max(160).optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "That isn't a GSTIN. It has 15 letters and numbers, such as 27AABCU9603R1ZM.")
    .optional(),
  address: z.string().trim().max(500).optional(),
  email: z.email("Check the email address.").optional(),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().min(10, "Write the phone number with its 10 digits.").max(15, "That phone number is too long."))
    .optional(),
  checkInTime: time("check-in time"),
  checkOutTime: time("check-out time"),
  holdMinutes: wholeNumber("The hold time", 1, 120),
  lowStockThreshold: wholeNumber("The low-rooms limit", 0, 50),
});

/** The resort's company details, times and booking settings (plan section 9, Settings). */
export async function saveSettings(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("settings.manage", propertyId);
    const input = settingsInput.parse(filled(form));
    const db = getDb();
    const [before] = await db.select().from(properties).where(eq(properties.id, propertyId));
    const [after] = await db
      .update(properties)
      .set({
        legalName: input.legalName ?? null,
        gstin: input.gstin ?? null,
        address: input.address ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        checkInTime: input.checkInTime,
        checkOutTime: input.checkOutTime,
        holdMinutes: input.holdMinutes,
        lowStockThreshold: input.lowStockThreshold,
      })
      .where(eq(properties.id, propertyId))
      .returning();
    await audit({ userId: staff.userId, propertyId, action: "property.settings", entity: "properties", entityId: propertyId, before, after });
    refresh();
    return { done: "Settings saved." };
  } catch (error) {
    return problem(error, "Only a Super Admin can change a resort's settings.");
  }
}

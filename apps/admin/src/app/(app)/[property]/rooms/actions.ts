"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ForbiddenError } from "@repo/auth";
import { getDb, properties, roomTypes, units } from "@repo/db";
import { audit, requirePermission } from "@/lib/staff";

/** What a form gets back: an error to show, or a short success note. */
export type FormState = { error?: string; done?: string } | undefined;

const categories = ["room", "cottage", "villa", "tent", "dormitory", "other"] as const;
/** A ticked checkbox sends "on"; an unticked one sends nothing at all. */
const checkbox = z.literal("on").optional().transform((value) => value === "on");
const count = (label: string, min: number, max: number) =>
  z.coerce.number({ error: `${label} must be a number.` }).int(`${label} must be a whole number.`).min(min, `${label} can't be below ${min}.`).max(max, `${label} can't be above ${max}.`);

const roomTypeInput = z
  .object({
    name: z.string().trim().min(2, "Give the room type a name.").max(80),
    code: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The code uses small letters, numbers and dashes, such as garden-cottage."),
    category: z.enum(categories),
    baseOccupancy: count("Guests in the base price", 1, 50),
    minGuests: count("The fewest guests", 1, 200),
    maxAdults: count("The most adults", 1, 200),
    maxChildren: count("The most children", 0, 200),
    maxGuests: count("The most guests", 1, 200),
    extraBedAllowed: checkbox,
    bedType: z.string().trim().max(60).optional(),
  })
  .refine((v) => v.maxGuests >= v.baseOccupancy, { error: "The most guests can't be fewer than the guests in the base price." })
  .refine((v) => v.maxGuests >= v.minGuests, { error: "The most guests can't be fewer than the fewest." });

/** The first problem, in words, or a general message. */
function problem(error: unknown): FormState {
  if (error instanceof z.ZodError) return { error: error.issues[0]?.message ?? "Check the form." };
  if (error instanceof ForbiddenError) return { error: "Your role can't change rooms at this resort." };
  throw error;
}

/** Adds a room type to a resort (RM-01). */
export async function createRoomType(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const staff = await requirePermission("rooms.manage", propertyId);
    const input = roomTypeInput.parse(Object.fromEntries(form));
    const db = getDb();
    const [property] = await db.select({ code: properties.code }).from(properties).where(eq(properties.id, propertyId));
    // New room types go to the end of the list.
    const [last] = await db.select({ sortOrder: roomTypes.sortOrder }).from(roomTypes).where(eq(roomTypes.propertyId, propertyId)).orderBy(desc(roomTypes.sortOrder)).limit(1);
    const [created] = await db
      .insert(roomTypes)
      .values({ propertyId, ...input, bedType: input.bedType || null, sortOrder: (last?.sortOrder ?? 0) + 1, createdBy: staff.userId })
      .onConflictDoNothing({ target: [roomTypes.propertyId, roomTypes.code] })
      .returning();
    if (!created) return { error: `This resort already has a room type with the code ${input.code}.` };
    await audit({ userId: staff.userId, propertyId, action: "room_type.create", entity: "room_types", entityId: created.id, after: created });
    revalidatePath(`/${property.code.toLowerCase()}/rooms`);
    return { done: `${created.name} added. Add its units next.` };
  } catch (error) {
    return problem(error);
  }
}

const unitsInput = z.object({
  prefix: z.string().trim().min(1, "Write a name, such as Cottage.").max(60),
  from: count("The first number", 0, 9999).optional(),
  to: count("The last number", 0, 9999).optional(),
  block: z.string().trim().max(60).optional(),
});

/**
 * Adds units under a room type (RM-02): one by name, or a numbered run such
 * as Cottage 1 to Cottage 12. Names already used are skipped.
 */
export async function addUnits(roomTypeId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const db = getDb();
    const [roomType] = await db.select().from(roomTypes).where(eq(roomTypes.id, roomTypeId));
    if (!roomType) return { error: "That room type no longer exists." };
    const staff = await requirePermission("rooms.manage", roomType.propertyId);

    const raw = Object.fromEntries([...form].filter(([, value]) => value !== ""));
    const input = unitsInput.parse(raw);
    const names =
      input.from !== undefined && input.to !== undefined
        ? Array.from({ length: Math.max(0, input.to - input.from + 1) }, (_, i) => `${input.prefix} ${input.from! + i}`)
        : [input.prefix];
    if (names.length === 0) return { error: "The last number must be the same as or after the first." };
    if (names.length > 200) return { error: "Add at most 200 units at a time." };

    const [last] = await db.select({ sortOrder: units.sortOrder }).from(units).where(eq(units.roomTypeId, roomTypeId)).orderBy(desc(units.sortOrder)).limit(1);
    const created = await db
      .insert(units)
      .values(names.map((name, i) => ({ propertyId: roomType.propertyId, roomTypeId, name, block: input.block || null, sortOrder: (last?.sortOrder ?? 0) + i + 1, createdBy: staff.userId })))
      .onConflictDoNothing({ target: [units.roomTypeId, units.name] })
      .returning();
    for (const unit of created) {
      await audit({ userId: staff.userId, propertyId: roomType.propertyId, action: "unit.create", entity: "units", entityId: unit.id, after: unit });
    }
    const [property] = await db.select({ code: properties.code }).from(properties).where(eq(properties.id, roomType.propertyId));
    revalidatePath(`/${property.code.toLowerCase()}/rooms`);
    const skipped = names.length - created.length;
    return { done: `${created.length} added${skipped ? `; ${skipped} already existed` : ""}.` };
  } catch (error) {
    return problem(error);
  }
}

/** A unit goes into use, under maintenance or out of use (RM-02). */
export async function setUnitStatus(unitId: string, status: "active" | "maintenance" | "inactive") {
  const db = getDb();
  const [unit] = await db.select().from(units).where(eq(units.id, unitId));
  if (!unit) return;
  const staff = await requirePermission("rooms.manage", unit.propertyId);
  const [changed] = await db.update(units).set({ status }).where(eq(units.id, unitId)).returning();
  await audit({ userId: staff.userId, propertyId: unit.propertyId, action: "unit.status", entity: "units", entityId: unitId, before: { status: unit.status }, after: { status: changed.status } });
  const [property] = await db.select({ code: properties.code }).from(properties).where(eq(properties.id, unit.propertyId));
  revalidatePath(`/${property.code.toLowerCase()}/rooms`);
}

/** Takes a room type off sale, or back on (RM-01: deactivate). */
export async function setRoomTypeStatus(roomTypeId: string, status: "active" | "inactive") {
  const db = getDb();
  const [roomType] = await db.select().from(roomTypes).where(eq(roomTypes.id, roomTypeId));
  if (!roomType) return;
  const staff = await requirePermission("rooms.manage", roomType.propertyId);
  await db.update(roomTypes).set({ status }).where(eq(roomTypes.id, roomTypeId));
  await audit({ userId: staff.userId, propertyId: roomType.propertyId, action: "room_type.status", entity: "room_types", entityId: roomTypeId, before: { status: roomType.status }, after: { status } });
  const [property] = await db.select({ code: properties.code }).from(properties).where(eq(properties.id, roomType.propertyId));
  revalidatePath(`/${property.code.toLowerCase()}/rooms`);
}

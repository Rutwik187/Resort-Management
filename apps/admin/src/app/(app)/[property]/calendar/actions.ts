"use server";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { blocks, dateRates, getDb, roomTypes, stayRules, units } from "@repo/db";
import { createBlock, liftBlock, NotFoundError, RuleError } from "@repo/engine";
import { checkbox, date, filled, problem, rupeesField, wholeNumber, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";

const id = z.uuid({ error: "That no longer exists." });

/** The nights from the first to the last, both included. At most a year at a time. */
function nightsBetween(first: string, last: string) {
  if (last < first) throw new RuleError("The last night must be on or after the first.");
  const nights: string[] = [];
  for (let d = new Date(`${first}T00:00:00Z`); d <= new Date(`${last}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) nights.push(d.toISOString().slice(0, 10));
  if (nights.length > 366) throw new RuleError("Choose at most a year at a time.");
  return nights;
}

/** Room types of this resort: one, or all when the form says "all". */
async function typesOf(propertyId: string, choice: string) {
  const rows = await getDb()
    .select({ id: roomTypes.id, name: roomTypes.name })
    .from(roomTypes)
    .where(and(eq(roomTypes.propertyId, propertyId), choice === "all" ? eq(roomTypes.status, "active") : eq(roomTypes.id, id.parse(choice))));
  if (rows.length === 0) throw new NotFoundError("Room type");
  return rows;
}

const reasons = ["maintenance", "owner_use", "ota_allocation", "wedding_buyout", "other"] as const;
const blockInput = z.object({
  scope: z.string({ error: "Choose what to block." }).min(1, "Choose what to block."),
  startsOn: date("first night"),
  endsOn: date("last night"),
  reason: z.enum(reasons, { error: "Choose why." }),
  note: z.string().trim().max(500).optional(),
});

/** Blocks one unit, a whole room type or the whole resort for a run of nights (INV-04, INV-05). */
export async function blockDates(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(propertyId);
    const staff = await requirePermission("inventory.block", propertyId);
    const input = blockInput.parse(filled(form));
    nightsBetween(input.startsOn, input.endsOn);
    const [kind, target] = input.scope.split(":");
    const db = getDb();
    let roomTypeId: string | undefined;
    let unitId: string | undefined;
    if (kind === "type") [{ id: roomTypeId }] = await typesOf(propertyId, target);
    if (kind === "unit") {
      const [unit] = await db.select({ id: units.id }).from(units).where(and(eq(units.propertyId, propertyId), eq(units.id, id.parse(target))));
      if (!unit) throw new NotFoundError("Unit");
      unitId = unit.id;
    }
    const { blockId, unitNights } = await createBlock(db, { propertyId, roomTypeId, unitId, startsOn: input.startsOn, endsOn: input.endsOn, reason: input.reason, note: input.note, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId, action: "block.create", entity: "blocks", entityId: blockId, after: { ...input, unitNights } });
    refresh();
    return { done: `Blocked ${unitNights} room ${unitNights === 1 ? "night" : "nights"}.` };
  } catch (error) {
    return problem(error, "Your role can't block rooms at this resort.");
  }
}

/** Lifts a block: its nights go back on sale; the block stays on record. */
export async function liftBlockAction(blockId: string): Promise<FormState> {
  try {
    id.parse(blockId);
    const [block] = await getDb().select().from(blocks).where(eq(blocks.id, blockId));
    if (!block) throw new NotFoundError("Block");
    const staff = await requirePermission("inventory.block", block.propertyId);
    await liftBlock(getDb(), { blockId, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId: block.propertyId, action: "block.lift", entity: "blocks", entityId: blockId, before: block });
    refresh();
    return { done: "Block lifted. The nights are back on sale." };
  } catch (error) {
    return problem(error, "Your role can't lift blocks at this resort.");
  }
}

const rulesInput = z
  .object({
    roomType: z.string().min(1, "Choose the room type."),
    from: date("first night"),
    to: date("last night"),
    stopSell: checkbox,
    closedToArrival: checkbox,
    minNights: wholeNumber("The fewest nights", 1, 60).optional(),
    maxNights: wholeNumber("The most nights", 1, 365).optional(),
  })
  .refine((v) => v.minNights === undefined || v.maxNights === undefined || v.maxNights >= v.minNights, { error: "The most nights can't be fewer than the fewest." });

/**
 * Sets stay rules for a run of nights (INV-08): stop sell, closed to
 * arrival, and the fewest and most nights for stays that start then. A form
 * with nothing ticked or filled clears the rules for those nights.
 */
export async function setStayRules(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(propertyId);
    const staff = await requirePermission("inventory.manage", propertyId);
    const input = rulesInput.parse(filled(form));
    const nights = nightsBetween(input.from, input.to);
    const types = await typesOf(propertyId, input.roomType);
    const db = getDb();
    const clear = !input.stopSell && !input.closedToArrival && input.minNights === undefined && input.maxNights === undefined;
    if (clear) {
      await db.delete(stayRules).where(and(inArray(stayRules.roomTypeId, types.map((t) => t.id)), gte(stayRules.night, input.from), lte(stayRules.night, input.to)));
    } else {
      const values = { stopSell: input.stopSell, closedToArrival: input.closedToArrival, minNights: input.minNights ?? null, maxNights: input.maxNights ?? null };
      await db
        .insert(stayRules)
        .values(types.flatMap((type) => nights.map((night) => ({ propertyId, roomTypeId: type.id, night, ...values, createdBy: staff.userId }))))
        .onConflictDoUpdate({ target: [stayRules.roomTypeId, stayRules.night], set: values });
    }
    await audit({ userId: staff.userId, propertyId, action: clear ? "stay_rules.clear" : "stay_rules.set", entity: "stay_rules", after: { ...input, roomTypes: types.map((t) => t.name) } });
    refresh();
    return { done: clear ? `Rules cleared for ${nights.length} ${nights.length === 1 ? "night" : "nights"}.` : `Rules set for ${nights.length} ${nights.length === 1 ? "night" : "nights"}.` };
  } catch (error) {
    return problem(error, "Your role can't set stay rules at this resort.");
  }
}

const pricesInput = z.object({
  roomType: z.string().min(1, "Choose the room type."),
  from: date("first night"),
  to: date("last night"),
  price: rupeesField("Price").optional(),
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
});

/**
 * Sets the base price of a room type for chosen nights (PR-04), beating
 * seasons and the base rate, or clears it when the price is left empty.
 * Nights can be limited to days of the week, such as Fridays and Saturdays.
 */
export async function setDatePrices(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(propertyId);
    const staff = await requirePermission("prices.manage", propertyId);
    const input = pricesInput.parse({ ...filled(form), weekdays: form.getAll("weekdays").map(String) });
    const days = input.weekdays?.length ? input.weekdays : [0, 1, 2, 3, 4, 5, 6];
    const nights = nightsBetween(input.from, input.to).filter((night) => days.includes(new Date(`${night}T00:00:00Z`).getUTCDay()));
    if (nights.length === 0) return { error: "None of those nights falls on the days you chose." };
    const [type] = await typesOf(propertyId, input.roomType);
    const db = getDb();
    if (input.price === undefined) {
      await db.delete(dateRates).where(and(eq(dateRates.roomTypeId, type.id), inArray(dateRates.night, nights)));
    } else {
      await db
        .insert(dateRates)
        .values(nights.map((night) => ({ propertyId, roomTypeId: type.id, night, basePaise: input.price!, createdBy: staff.userId })))
        .onConflictDoUpdate({ target: [dateRates.roomTypeId, dateRates.night], set: { basePaise: input.price } });
    }
    await audit({ userId: staff.userId, propertyId, action: input.price === undefined ? "date_rates.clear" : "date_rates.set", entity: "date_rates", entityId: type.id, after: { roomType: type.name, nights, basePaise: input.price ?? null } });
    refresh();
    return { done: input.price === undefined ? `Date prices removed from ${nights.length} ${nights.length === 1 ? "night" : "nights"}.` : `${type.name}: price set for ${nights.length} ${nights.length === 1 ? "night" : "nights"}.` };
  } catch (error) {
    return problem(error, "Your role can't change prices at this resort.");
  }
}

"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { ageBands, getDb, offeringChildPrices, offerings, offeringSlots } from "@repo/db";
import { NotFoundError, RuleError, setDayCapacity } from "@repo/engine";
import { shortDate } from "@/lib/format";
import { checkbox, date, filled, problem, rupeesField, wholeNumber, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";
import { websiteChanged } from "@/lib/website";

const id = z.uuid({ error: "That no longer exists." });
const forbidden = "Your role can't change packages at this resort.";
const time = z.string().regex(/^\d{2}:\d{2}$/, "Write the time as hh:mm.").optional();

const offeringInput = z
  .object({
    kind: z.enum(["day_package", "activity", "dining", "other"], { error: "Choose what it is." }),
    name: z.string().trim().min(2, "Name it, such as Morning picnic.").max(80),
    summary: z.string().trim().max(500).optional(),
    adult: rupeesField("Price for an adult"),
    validFrom: date("first day").optional(),
    validTo: date("last day").optional(),
  })
  .refine((v) => !v.validFrom || !v.validTo || v.validTo >= v.validFrom, { error: "The last day must be on or after the first." });

/** The days of the week ticked, or null for every day. */
const soldOn = (form: FormData) => {
  const days = [...new Set(form.getAll("soldOn").map((d) => z.coerce.number().int().min(0).max(6).parse(d)))].sort();
  return days.length === 0 || days.length === 7 ? null : days;
};

/** What each paid child band pays; an empty price stays unpublished. */
async function childPrices(propertyId: string, form: FormData) {
  const bands = await getDb().select().from(ageBands).where(eq(ageBands.propertyId, propertyId));
  return bands
    .filter((band) => !band.free)
    .flatMap((band) => {
      const raw = String(form.get(`child:${band.id}`) ?? "").trim();
      return raw ? [{ ageBandId: band.id, paise: rupeesField(`Price for ${band.label}`).parse(raw) }] : [];
    });
}

const slotInput = z
  .object({
    label: z.string().trim().min(2, "Name the time, such as Morning or Lunch.").max(60),
    startsAt: time,
    endsAt: time,
    capacity: wholeNumber("Seats a day", 0, 5000),
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.endsAt > v.startsAt, { error: "It must end after it starts." });

/**
 * Adds something sold by the day and counted in guests (INV-09): a day
 * package, an activity, a meal sitting or another ticket, with its first
 * time slot and that slot's usual seats a day.
 */
export async function createOffering(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(propertyId);
    const staff = await requirePermission("prices.manage", propertyId);
    const fields = filled(form);
    const input = offeringInput.parse(fields);
    const code = z
      .string({ error: "Give it a code." })
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The code uses small letters, numbers and dashes, such as morning-picnic.")
      .parse(fields.code);
    const slot = slotInput.parse({ label: fields.slotLabel ?? "All day", startsAt: fields.startsAt, endsAt: fields.endsAt, capacity: fields.capacity });
    const children = await childPrices(propertyId, form);
    const db = getDb();
    const created = await db.transaction(async (tx) => {
      const [offering] = await tx
        .insert(offerings)
        .values({ propertyId, kind: input.kind, code, name: input.name, summary: input.summary ?? null, adultPaise: input.adult, soldOn: soldOn(form), validFrom: input.validFrom ?? null, validTo: input.validTo ?? null, createdBy: staff.userId })
        .onConflictDoNothing({ target: [offerings.propertyId, offerings.code] })
        .returning();
      if (!offering) throw new RuleError(`This resort already has something with the code ${code}.`);
      if (children.length) await tx.insert(offeringChildPrices).values(children.map((c) => ({ offeringId: offering.id, ...c })));
      await tx.insert(offeringSlots).values({ propertyId, offeringId: offering.id, label: slot.label, startsAt: slot.startsAt ?? null, endsAt: slot.endsAt ?? null, defaultCapacity: slot.capacity });
      return offering;
    });
    await audit({ userId: staff.userId, propertyId, action: "offering.create", entity: "offerings", entityId: created.id, after: { ...created, children, slot } });
    websiteChanged(propertyId);
    refresh();
    return { done: `${created.name} added.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

async function offeringOf(offeringId: string) {
  id.parse(offeringId);
  const [offering] = await getDb().select().from(offerings).where(eq(offerings.id, offeringId));
  if (!offering) throw new NotFoundError("Package");
  return offering;
}

/** Changes a package's name, prices, days and dates. Its code stays. */
export async function updateOffering(offeringId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const before = await offeringOf(offeringId);
    const staff = await requirePermission("prices.manage", before.propertyId);
    const input = offeringInput.parse(filled(form));
    const children = await childPrices(before.propertyId, form);
    const after = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .update(offerings)
        .set({ kind: input.kind, name: input.name, summary: input.summary ?? null, adultPaise: input.adult, soldOn: soldOn(form), validFrom: input.validFrom ?? null, validTo: input.validTo ?? null })
        .where(eq(offerings.id, offeringId))
        .returning();
      await tx.delete(offeringChildPrices).where(eq(offeringChildPrices.offeringId, offeringId));
      if (children.length) await tx.insert(offeringChildPrices).values(children.map((c) => ({ offeringId, ...c })));
      return row;
    });
    await audit({ userId: staff.userId, propertyId: before.propertyId, action: "offering.update", entity: "offerings", entityId: offeringId, before, after: { ...after, children } });
    websiteChanged(before.propertyId);
    refresh();
    return { done: "Saved." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Puts a package on sale or takes it off (PKG-01). */
export async function setOfferingActive(offeringId: string, active: boolean): Promise<FormState> {
  try {
    const before = await offeringOf(offeringId);
    const staff = await requirePermission("prices.manage", before.propertyId);
    await getDb().update(offerings).set({ active: Boolean(active) }).where(eq(offerings.id, offeringId));
    await audit({ userId: staff.userId, propertyId: before.propertyId, action: "offering.active", entity: "offerings", entityId: offeringId, before: { active: before.active }, after: { active: Boolean(active) } });
    websiteChanged(before.propertyId);
    refresh();
    return { done: active ? "On sale." : "Off sale." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Copies a package, its child prices and its slots, off sale, to change into a similar one (PKG-02). */
export async function duplicateOffering(offeringId: string): Promise<FormState> {
  try {
    const source = await offeringOf(offeringId);
    const staff = await requirePermission("prices.manage", source.propertyId);
    const db = getDb();
    const copy = await db.transaction(async (tx) => {
      const taken = new Set((await tx.select({ code: offerings.code }).from(offerings).where(eq(offerings.propertyId, source.propertyId))).map((o) => o.code));
      let code = `${source.code}-copy`;
      for (let n = 2; taken.has(code); n++) code = `${source.code}-copy-${n}`;
      const [offering] = await tx
        .insert(offerings)
        .values({
          propertyId: source.propertyId,
          kind: source.kind,
          code,
          name: `${source.name} (copy)`,
          summary: source.summary,
          adultPaise: source.adultPaise,
          soldOn: source.soldOn,
          validFrom: source.validFrom,
          validTo: source.validTo,
          active: false,
          sortOrder: source.sortOrder,
          createdBy: staff.userId,
        })
        .returning();
      const children = await tx.select().from(offeringChildPrices).where(eq(offeringChildPrices.offeringId, source.id));
      if (children.length) await tx.insert(offeringChildPrices).values(children.map((c) => ({ offeringId: offering.id, ageBandId: c.ageBandId, paise: c.paise })));
      const slots = await tx.select().from(offeringSlots).where(eq(offeringSlots.offeringId, source.id));
      if (slots.length) {
        await tx.insert(offeringSlots).values(slots.map((s) => ({ propertyId: s.propertyId, offeringId: offering.id, label: s.label, startsAt: s.startsAt, endsAt: s.endsAt, defaultCapacity: s.defaultCapacity, active: s.active, sortOrder: s.sortOrder })));
      }
      return offering;
    });
    await audit({ userId: staff.userId, propertyId: source.propertyId, action: "offering.duplicate", entity: "offerings", entityId: copy.id, before: { from: source.id }, after: copy });
    refresh();
    return { done: `Copied as ${copy.name}, off sale. Change it, then put it on sale.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Adds a time slot to a package, such as a second lunch sitting. */
export async function addSlot(offeringId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const offering = await offeringOf(offeringId);
    const staff = await requirePermission("prices.manage", offering.propertyId);
    const slot = slotInput.parse(filled(form));
    const [created] = await getDb()
      .insert(offeringSlots)
      .values({ propertyId: offering.propertyId, offeringId, label: slot.label, startsAt: slot.startsAt ?? null, endsAt: slot.endsAt ?? null, defaultCapacity: slot.capacity })
      .onConflictDoNothing({ target: [offeringSlots.offeringId, offeringSlots.label] })
      .returning();
    if (!created) return { error: `${offering.name} already has a slot called ${slot.label}.` };
    await audit({ userId: staff.userId, propertyId: offering.propertyId, action: "slot.create", entity: "offering_slots", entityId: created.id, after: created });
    websiteChanged(offering.propertyId);
    refresh();
    return { done: `${slot.label} added.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Changes a slot's name, times, usual seats a day, or puts it off sale. */
export async function updateSlot(slotId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(slotId);
    const [before] = await getDb().select().from(offeringSlots).where(eq(offeringSlots.id, slotId));
    if (!before) throw new NotFoundError("Slot");
    const staff = await requirePermission("prices.manage", before.propertyId);
    const fields = filled(form);
    const slot = slotInput.parse(fields);
    const active = checkbox.parse(fields.active);
    const clash = await getDb().select({ id: offeringSlots.id }).from(offeringSlots).where(and(eq(offeringSlots.offeringId, before.offeringId), eq(offeringSlots.label, slot.label)));
    if (clash.some((c) => c.id !== slotId)) return { error: `Another slot is already called ${slot.label}.` };
    const [after] = await getDb()
      .update(offeringSlots)
      .set({ label: slot.label, startsAt: slot.startsAt ?? null, endsAt: slot.endsAt ?? null, defaultCapacity: slot.capacity, active })
      .where(eq(offeringSlots.id, slotId))
      .returning();
    await audit({ userId: staff.userId, propertyId: before.propertyId, action: "slot.update", entity: "offering_slots", entityId: slotId, before, after });
    websiteChanged(before.propertyId);
    refresh();
    return { done: "Saved. Days already set keep their own seats." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

const capacityInput = z.object({ from: date("first day"), to: date("last day"), seats: wholeNumber("Seats", 0, 5000) });

/** Sets a slot's seats for chosen days (INV-09). A day with more guests already booked keeps its seats. */
export async function setSeats(slotId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(slotId);
    const [slot] = await getDb().select().from(offeringSlots).where(eq(offeringSlots.id, slotId));
    if (!slot) throw new NotFoundError("Slot");
    const staff = await requirePermission("inventory.manage", slot.propertyId);
    const input = capacityInput.parse(filled(form));
    if (input.to < input.from) throw new RuleError("The last day must be on or after the first.");
    const days: string[] = [];
    for (let d = new Date(`${input.from}T00:00:00Z`); d <= new Date(`${input.to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
    if (days.length > 366) throw new RuleError("Choose at most a year at a time.");
    const result = await setDayCapacity(getDb(), { slotId, days, capacity: input.seats, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId: slot.propertyId, action: "capacity.set", entity: "offering_slots", entityId: slotId, after: { ...input, ...result } });
    refresh();
    if (result.kept.length === 0) return { done: `${input.seats} seats a day set for ${result.changed} ${result.changed === 1 ? "day" : "days"}.` };
    const kept = result.kept.map(shortDate).join(", ");
    const one = result.kept.length === 1;
    return result.changed === 0
      ? { error: `Nothing changed: ${kept} already ${one ? "has" : "have"} more guests booked than ${input.seats}.` }
      : { error: `Set for ${result.changed} ${result.changed === 1 ? "day" : "days"}. ${kept} already ${one ? "has" : "have"} more guests booked, so ${one ? "it keeps its" : "they keep their"} seats.` };
  } catch (error) {
    return problem(error, "Your role can't set day capacity at this resort.");
  }
}

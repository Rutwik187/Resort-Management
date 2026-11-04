"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { ageBands, getDb, properties, rateChildPrices, rates, roomTypes, seasons } from "@repo/db";
import { NotFoundError, RuleError } from "@repo/engine";
import { checkbox, date, filled, problem, rupeesField, wholeNumber, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";

const id = z.uuid({ error: "That no longer exists." });
const forbidden = "Your role can't change prices at this resort.";

/** Which nights take the weekend rate (PR-02). */
export async function saveWeekendNights(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(propertyId);
    const staff = await requirePermission("prices.manage", propertyId);
    const nights = [...new Set(form.getAll("nights").map((n) => z.coerce.number().int().min(0).max(6).parse(n)))].sort();
    const [before] = await getDb().select({ weekendNights: properties.weekendNights }).from(properties).where(eq(properties.id, propertyId));
    await getDb().update(properties).set({ weekendNights: nights }).where(eq(properties.id, propertyId));
    await audit({ userId: staff.userId, propertyId, action: "property.weekend_nights", entity: "properties", entityId: propertyId, before, after: { weekendNights: nights } });
    refresh();
    return { done: nights.length ? "Weekend nights saved." : "Saved. No night takes the weekend rate now." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

const rateInput = z.object({
  roomTypeId: id,
  seasonId: id.optional(),
  dayKind: z.enum(["any", "weekday", "weekend"], { error: "Choose the nights." }),
  basis: z.enum(["room", "person"], { error: "Choose per room or per person." }),
  base: rupeesField("Price"),
  extraAdult: rupeesField("Extra adult").optional(),
  extraBed: rupeesField("Extra bed").optional(),
  mealPlan: z.enum(["EP", "CP", "MAP", "AP"], { error: "Choose the meals." }),
});

/**
 * Saves a room type's rate for weekday, weekend or every night, as its base
 * rate or a season's (PR-01, PR-02, PR-03, PR-05), with what each child age
 * band pays. A child price left empty stays unpublished, so a booking with
 * such a child shows "rate to confirm" rather than a guess.
 */
export async function saveRate(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(propertyId);
    const staff = await requirePermission("prices.manage", propertyId);
    const input = rateInput.parse(filled(form));
    const db = getDb();
    const [type] = await db.select({ name: roomTypes.name }).from(roomTypes).where(and(eq(roomTypes.id, input.roomTypeId), eq(roomTypes.propertyId, propertyId)));
    if (!type) throw new NotFoundError("Room type");
    if (input.seasonId) {
      const [season] = await db.select({ id: seasons.id }).from(seasons).where(and(eq(seasons.id, input.seasonId), eq(seasons.propertyId, propertyId)));
      if (!season) throw new NotFoundError("Season");
    }
    const bands = await db.select().from(ageBands).where(eq(ageBands.propertyId, propertyId));
    const children = bands
      .filter((band) => !band.free)
      .flatMap((band) => {
        const raw = String(form.get(`child:${band.id}`) ?? "").trim();
        return raw ? [{ ageBandId: band.id, paise: rupeesField(`Price for ${band.label}`).parse(raw) }] : [];
      });

    const values = {
      basis: input.basis,
      basePaise: input.base,
      extraAdultPaise: input.extraAdult ?? null,
      extraBedPaise: input.extraBed ?? null,
      mealPlan: input.mealPlan,
    };
    const saved = await db.transaction(async (tx) => {
      const match = and(eq(rates.roomTypeId, input.roomTypeId), input.seasonId ? eq(rates.seasonId, input.seasonId) : isNull(rates.seasonId), eq(rates.dayKind, input.dayKind));
      const [existing] = await tx.select().from(rates).where(match).for("update");
      const [rate] = existing
        ? await tx.update(rates).set(values).where(eq(rates.id, existing.id)).returning()
        : await tx
            .insert(rates)
            .values({ propertyId, roomTypeId: input.roomTypeId, seasonId: input.seasonId ?? null, dayKind: input.dayKind, ...values, createdBy: staff.userId })
            .returning();
      await tx.delete(rateChildPrices).where(eq(rateChildPrices.rateId, rate.id));
      if (children.length) await tx.insert(rateChildPrices).values(children.map((child) => ({ rateId: rate.id, ...child })));
      return { before: existing ?? null, after: { ...rate, children } };
    });
    await audit({ userId: staff.userId, propertyId, action: saved.before ? "rate.update" : "rate.create", entity: "rates", entityId: saved.after.id, before: saved.before, after: saved.after });
    refresh();
    return { done: `${type.name}: rate saved.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Removes a rate. Nights it priced then take the next rate that applies, or show "rate to confirm". */
export async function removeRate(rateId: string): Promise<FormState> {
  try {
    id.parse(rateId);
    const [rate] = await getDb().select().from(rates).where(eq(rates.id, rateId));
    if (!rate) throw new NotFoundError("Rate");
    const staff = await requirePermission("prices.manage", rate.propertyId);
    await getDb().delete(rates).where(eq(rates.id, rateId));
    await audit({ userId: staff.userId, propertyId: rate.propertyId, action: "rate.delete", entity: "rates", entityId: rateId, before: rate });
    refresh();
    return { done: "Rate removed." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

const seasonInput = z
  .object({
    name: z.string().trim().min(2, "Name the season, such as Diwali.").max(60),
    startsOn: date("first night"),
    endsOn: date("last night"),
    priority: wholeNumber("Priority", 0, 100).optional(),
  })
  .refine((v) => v.endsOn >= v.startsOn, { error: "The last night must be on or after the first." });

/** A named run of nights with its own rates, such as Diwali or Christmas and New Year (PR-03). */
export async function createSeason(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(propertyId);
    const staff = await requirePermission("prices.manage", propertyId);
    const input = seasonInput.parse(filled(form));
    const [season] = await getDb()
      .insert(seasons)
      .values({ propertyId, name: input.name, startsOn: input.startsOn, endsOn: input.endsOn, priority: input.priority ?? 0, createdBy: staff.userId })
      .returning();
    await audit({ userId: staff.userId, propertyId, action: "season.create", entity: "seasons", entityId: season.id, after: season });
    refresh();
    return { done: `${season.name} added. Give it rates below.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Removes a season and its rates. */
export async function deleteSeason(seasonId: string): Promise<FormState> {
  try {
    id.parse(seasonId);
    const [season] = await getDb().select().from(seasons).where(eq(seasons.id, seasonId));
    if (!season) throw new NotFoundError("Season");
    const staff = await requirePermission("prices.manage", season.propertyId);
    await getDb().delete(seasons).where(eq(seasons.id, seasonId));
    await audit({ userId: staff.userId, propertyId: season.propertyId, action: "season.delete", entity: "seasons", entityId: seasonId, before: season });
    refresh();
    return { done: "Season removed." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

const bandInput = z
  .object({
    label: z.string().trim().min(2, "Name the band, such as 5 to 11.").max(40),
    code: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(_[a-z0-9]+)*$/, "The code uses small letters, numbers and underscores, such as child_5_11."),
    minAge: wholeNumber("The youngest age", 0, 17),
    maxAge: wholeNumber("The oldest age", 0, 17),
    free: checkbox,
  })
  .refine((v) => v.maxAge >= v.minAge, { error: "The oldest age can't be below the youngest." });

/** Adds or changes a child age band (PR-05). Bands can't overlap; guests older than every band pay as adults. */
export async function saveBand(propertyId: string, bandId: string | null, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(propertyId);
    if (bandId) id.parse(bandId);
    const staff = await requirePermission("prices.manage", propertyId);
    const input = bandInput.parse(filled(form));
    const db = getDb();
    const others = await db.select().from(ageBands).where(and(eq(ageBands.propertyId, propertyId), bandId ? ne(ageBands.id, bandId) : undefined));
    const clash = others.find((band) => input.minAge <= band.maxAge && band.minAge <= input.maxAge);
    if (clash) throw new RuleError(`Those ages overlap ${clash.label} (${clash.minAge} to ${clash.maxAge}).`);
    if (others.some((band) => band.code === input.code)) throw new RuleError(`Another band already uses the code ${input.code}.`);

    if (bandId) {
      const [before] = await db.select().from(ageBands).where(and(eq(ageBands.id, bandId), eq(ageBands.propertyId, propertyId)));
      if (!before) throw new NotFoundError("Age band");
      // The code is kept: bookings and prices refer to it.
      const [after] = await db.update(ageBands).set({ label: input.label, minAge: input.minAge, maxAge: input.maxAge, free: input.free }).where(eq(ageBands.id, bandId)).returning();
      await audit({ userId: staff.userId, propertyId, action: "age_band.update", entity: "age_bands", entityId: bandId, before, after });
    } else {
      const sortOrder = Math.max(0, ...others.map((b) => b.sortOrder)) + 1;
      const [band] = await db.insert(ageBands).values({ propertyId, code: input.code, label: input.label, minAge: input.minAge, maxAge: input.maxAge, free: input.free, sortOrder }).returning();
      await audit({ userId: staff.userId, propertyId, action: "age_band.create", entity: "age_bands", entityId: band.id, after: band });
    }
    refresh();
    return { done: "Age band saved." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

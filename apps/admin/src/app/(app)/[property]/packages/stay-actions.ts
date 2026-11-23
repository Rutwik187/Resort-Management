"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { ageBands, getDb, roomTypes, stayPackageChildPrices, stayPackages } from "@repo/db";
import { NotFoundError, RuleError } from "@repo/engine";
import { checkbox, date, filled, problem, rupeesField, wholeNumber, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";
import { websiteChanged } from "@/lib/website";

/*
 * Stay, staycation and custom packages (URD 5.3, PKG-01, PKG-02): a room of
 * a linked room type for set nights, at the package's price, with its
 * inclusions. They use the room types' rooms, so they never oversell.
 */

const id = z.uuid({ error: "That no longer exists." });
const forbidden = "Your role can't change packages at this resort.";
const lines = (raw: unknown) =>
  String(raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30);

const packageInput = z
  .object({
    kind: z.enum(["stay", "staycation", "custom"], { error: "Choose the kind of package." }),
    name: z.string().trim().min(3, "Name it, such as Weekend escape.").max(80),
    summary: z.string().trim().max(300).optional(),
    mealPlan: z.enum(["EP", "CP", "MAP", "AP"]),
    nights: wholeNumber("Nights", 1, 30).optional(),
    minNights: wholeNumber("The fewest nights", 1, 30).optional(),
    maxNights: wholeNumber("The most nights", 1, 60).optional(),
    basis: z.enum(["person", "couple", "room"]),
    priceUnit: z.enum(["stay", "night"]),
    price: rupeesField("The package price"),
    extraAdult: rupeesField("Each extra adult").optional(),
    validFrom: date("first arrival day").optional(),
    validTo: date("last arrival day").optional(),
    capacityPerDay: wholeNumber("Packages a day", 1, 500).optional(),
    cancellationNote: z.string().trim().max(500).optional(),
    featured: checkbox,
    onWebsite: checkbox,
  })
  .refine((v) => !v.validFrom || !v.validTo || v.validTo >= v.validFrom, { error: "The last arrival day must be on or after the first." })
  .refine((v) => !v.minNights || !v.maxNights || v.maxNights >= v.minNights, { error: "The most nights can't be below the fewest." })
  .refine((v) => v.priceUnit === "night" || v.nights, { error: "A price for the whole stay needs a fixed number of nights." });

async function parsePackage(propertyId: string, form: FormData) {
  const fields = filled(form);
  for (const key of ["roomTypeIds", "arrivalDays", "inclusions", "exclusions", "blackoutDates"]) delete fields[key];
  const input = packageInput.parse(fields);
  const typeIds = z.array(z.uuid()).min(1, "Tick at least one room type it can be booked in.").max(50).parse(form.getAll("roomTypeIds").filter((v) => v !== ""));
  const db = getDb();
  const own = await db.select({ id: roomTypes.id }).from(roomTypes).where(and(eq(roomTypes.propertyId, propertyId), inArray(roomTypes.id, typeIds)));
  if (own.length !== typeIds.length) throw new RuleError("One of those room types isn't at this resort.");
  const days = [...new Set(form.getAll("arrivalDays").map((d) => z.coerce.number().int().min(0).max(6).parse(d)))].sort();
  const blackout = String(form.get("blackoutDates") ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((d) => z.iso.date({ error: `${d} isn't a date. Write blackout dates as yyyy-mm-dd, separated by commas.` }).parse(d));
  const bands = await db.select().from(ageBands).where(eq(ageBands.propertyId, propertyId));
  const children = bands
    .filter((band) => !band.free)
    .flatMap((band) => {
      const raw = String(form.get(`child:${band.id}`) ?? "").trim();
      return raw ? [{ ageBandId: band.id, paise: rupeesField(`Price for ${band.label}`).parse(raw) }] : [];
    });
  const values = {
    kind: input.kind,
    name: input.name,
    summary: input.summary ?? null,
    inclusions: lines(form.get("inclusions")),
    exclusions: lines(form.get("exclusions")),
    mealPlan: input.mealPlan,
    roomTypeIds: typeIds,
    nights: input.nights ?? null,
    minNights: input.nights ? null : (input.minNights ?? null),
    maxNights: input.nights ? null : (input.maxNights ?? null),
    basis: input.basis,
    priceUnit: input.priceUnit,
    pricePaise: input.price,
    extraAdultPaise: input.basis === "person" ? null : (input.extraAdult ?? null),
    arrivalDays: days.length === 0 || days.length === 7 ? null : days,
    validFrom: input.validFrom ?? null,
    validTo: input.validTo ?? null,
    blackoutDates: [...new Set(blackout)].sort(),
    capacityPerDay: input.capacityPerDay ?? null,
    cancellationNote: input.cancellationNote ?? null,
    featured: input.featured,
    onWebsite: input.onWebsite,
  };
  return { values, children };
}

/** Adds a stay package, or changes one (packageId set). */
export async function saveStayPackage(propertyId: string, packageId: string | null, _state: FormState, form: FormData): Promise<FormState> {
  try {
    id.parse(propertyId);
    const staff = await requirePermission("prices.manage", propertyId);
    const { values, children } = await parsePackage(propertyId, form);
    const db = getDb();
    if (packageId) {
      id.parse(packageId);
      const [before] = await db.select().from(stayPackages).where(and(eq(stayPackages.id, packageId), eq(stayPackages.propertyId, propertyId)));
      if (!before) throw new NotFoundError("Package");
      const after = await db.transaction(async (tx) => {
        const [row] = await tx.update(stayPackages).set(values).where(eq(stayPackages.id, packageId)).returning();
        await tx.delete(stayPackageChildPrices).where(eq(stayPackageChildPrices.packageId, packageId));
        if (children.length) await tx.insert(stayPackageChildPrices).values(children.map((c) => ({ packageId, ...c })));
        return row;
      });
      await audit({ userId: staff.userId, propertyId, action: "stay_package.update", entity: "stay_packages", entityId: packageId, before, after: { ...after, children } });
    } else {
      const code = z
        .string({ error: "Give it a code." })
        .trim()
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The code uses small letters, numbers and dashes, such as weekend-escape.")
        .parse(form.get("code") || undefined);
      const created = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(stayPackages)
          .values({ propertyId, code, ...values, createdBy: staff.userId })
          .onConflictDoNothing({ target: [stayPackages.propertyId, stayPackages.code] })
          .returning();
        if (!row) throw new RuleError(`This resort already has a package with the code ${code}.`);
        if (children.length) await tx.insert(stayPackageChildPrices).values(children.map((c) => ({ packageId: row.id, ...c })));
        return row;
      });
      await audit({ userId: staff.userId, propertyId, action: "stay_package.create", entity: "stay_packages", entityId: created.id, after: { ...created, children } });
    }
    websiteChanged(propertyId);
    refresh();
    return { done: packageId ? "Package saved." : `${values.name} added.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

async function packageOf(packageId: string) {
  id.parse(packageId);
  const [row] = await getDb().select().from(stayPackages).where(eq(stayPackages.id, packageId));
  if (!row) throw new NotFoundError("Package");
  return row;
}

/** Puts a stay package on sale or takes it off (PKG-01). */
export async function setStayPackageActive(packageId: string, active: boolean): Promise<FormState> {
  try {
    const before = await packageOf(packageId);
    const staff = await requirePermission("prices.manage", before.propertyId);
    await getDb().update(stayPackages).set({ active: Boolean(active) }).where(eq(stayPackages.id, packageId));
    await audit({ userId: staff.userId, propertyId: before.propertyId, action: "stay_package.active", entity: "stay_packages", entityId: packageId, before: { active: before.active }, after: { active: Boolean(active) } });
    websiteChanged(before.propertyId);
    refresh();
    return { done: active ? `${before.name} is on sale.` : `${before.name} is off sale.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Copies a stay package and its child prices, off sale, to change into a similar one (PKG-02). */
export async function duplicateStayPackage(packageId: string): Promise<FormState> {
  try {
    const source = await packageOf(packageId);
    const staff = await requirePermission("prices.manage", source.propertyId);
    const db = getDb();
    const copy = await db.transaction(async (tx) => {
      const taken = new Set((await tx.select({ code: stayPackages.code }).from(stayPackages).where(eq(stayPackages.propertyId, source.propertyId))).map((p) => p.code));
      let code = `${source.code}-copy`;
      for (let n = 2; taken.has(code); n++) code = `${source.code}-copy-${n}`;
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = source;
      const [row] = await tx.insert(stayPackages).values({ ...rest, code, name: `${source.name} (copy)`, active: false, createdBy: staff.userId }).returning();
      const children = await tx.select().from(stayPackageChildPrices).where(eq(stayPackageChildPrices.packageId, source.id));
      if (children.length) await tx.insert(stayPackageChildPrices).values(children.map((c) => ({ packageId: row.id, ageBandId: c.ageBandId, paise: c.paise })));
      return row;
    });
    await audit({ userId: staff.userId, propertyId: source.propertyId, action: "stay_package.duplicate", entity: "stay_packages", entityId: copy.id, before: { from: source.id }, after: copy });
    refresh();
    return { done: `Copied as ${copy.name}, off sale. Change it, then put it on sale.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

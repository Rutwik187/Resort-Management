import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { properties as siteProperties } from "@repo/sites";
import { databaseUrl } from "./env";
import {
  ageBands,
  builtInRoles,
  createDb,
  offeringChildPrices,
  offerings,
  offeringSlots,
  properties,
  rateChildPrices,
  rates,
  rolePermissions,
  roles,
  roomTypes,
  staffMembers,
  units,
  user,
} from "../src";

/*
 * Sets up a database: the four resorts, their child age bands, the five
 * roles, the first Super Admin, and the main site's rooms and day packages.
 * Safe to run again: it only adds what is missing and never overwrites
 * what staff have changed.
 */

/*
 * The main site's rooms, rates and day packages come from its own content
 * file: the plan's import script (section 10). It is loaded at run time, so
 * type checks don't follow it into the app's photo imports. These types
 * name only the fields read here.
 */
type RatePlan = { basis: "per couple" | "per person"; base: number; extraPerson?: number; child5to11: number; child3to5: number };
type KsStay = { slug: string; name: string; rooms: string; guests: string; weekday?: RatePlan; weekend?: RatePlan; everyDay?: RatePlan };
type KsDayPackage = { name: string; start: number; end: number; hours: string; meals: string; adult: number; child5to11: number; child3to5: number };
const ksContent = new URL("../../../apps/khed-shivapur/src/content/resort.ts", import.meta.url).href;
const { stays: ksStays, dayPackages: ksDayPackages } = (await import(ksContent)) as { stays: KsStay[]; dayPackages: KsDayPackage[] };

const db = createDb(databaseUrl(), 1);
const rupees = (amount: number) => Math.round(amount * 100);

/** The bands every site uses today. Guests aged 12 and over pay as adults. */
const bands = [
  { code: "infant", label: "Under 3", minAge: 0, maxAge: 2, free: true, sortOrder: 1 },
  { code: "child_3_5", label: "3 to 5", minAge: 3, maxAge: 4, free: false, sortOrder: 2 },
  { code: "child_5_11", label: "5 to 11", minAge: 5, maxAge: 11, free: false, sortOrder: 3 },
];

await db.transaction(async (tx) => {
  // Resorts.
  for (const [i, site] of siteProperties.entries()) {
    await tx
      .insert(properties)
      .values({ code: site.code, name: site.name, sortOrder: i })
      .onConflictDoNothing({ target: properties.code });
  }
  const resorts = await tx.select({ id: properties.id, code: properties.code }).from(properties);

  // Child age bands.
  for (const resort of resorts) {
    for (const band of bands) {
      await tx
        .insert(ageBands)
        .values({ propertyId: resort.id, ...band })
        .onConflictDoNothing({ target: [ageBands.propertyId, ageBands.code] });
    }
  }

  // Roles and their permissions, only where a role is new.
  for (const role of builtInRoles) {
    const [created] = await tx
      .insert(roles)
      .values({ key: role.key, name: role.name, description: role.description, builtIn: true })
      .onConflictDoNothing({ target: roles.key })
      .returning({ id: roles.id });
    if (created) await tx.insert(rolePermissions).values(role.permissions.map((permission) => ({ roleId: created.id, permission })));
  }

  // The first Super Admin, who then invites everyone else from the admin.
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (email) {
    const [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email));
    const userId = existing?.id ?? randomUUID();
    if (!existing) await tx.insert(user).values({ id: userId, email, name: process.env.SEED_SUPER_ADMIN_NAME?.trim() || email, emailVerified: true });
    const [superAdmin] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, "super_admin"));
    await tx.insert(staffMembers).values({ userId, roleId: superAdmin.id, allProperties: true }).onConflictDoNothing();
  }

  // The main site's rooms, cottages, tents and villa, with their rates. Only when it has none yet.
  const ks = resorts.find((r) => r.code === "KS")!;
  const ksBands = await tx.select().from(ageBands).where(eq(ageBands.propertyId, ks.id));
  const band = (code: string) => ksBands.find((b) => b.code === code)!.id;
  const [anyRoomType] = await tx.select({ id: roomTypes.id }).from(roomTypes).where(eq(roomTypes.propertyId, ks.id)).limit(1);
  if (!anyRoomType) {
    for (const [i, stay] of ksStays.entries()) {
      const plan = stay.weekday ?? stay.everyDay!;
      const perPerson = plan.basis === "per person";
      const unitCount = /^one\b/i.test(stay.rooms) ? 1 : Number(stay.rooms.match(/\d+/)?.[0] ?? 1);
      const noun = stay.rooms.replace(/^(one|\d+)\s+(\d\s*BHK\s+)?/i, "").split(/[ ,]/)[0].toLowerCase();
      const category = noun.startsWith("tent") ? "tent" : noun.startsWith("cottage") ? "cottage" : noun.startsWith("villa") ? "villa" : "room";
      const [low, high = low] = (stay.guests.match(/\d+/g) ?? ["2"]).map(Number);

      const [roomType] = await tx
        .insert(roomTypes)
        .values({
          propertyId: ks.id,
          code: stay.slug,
          name: stay.name,
          category,
          baseOccupancy: perPerson ? 1 : 2,
          minGuests: perPerson ? low : 1,
          maxAdults: high,
          maxChildren: Math.max(0, high - 1),
          maxGuests: high,
          sortOrder: i,
        })
        .returning({ id: roomTypes.id });

      const unitName = category === "room" ? "Room" : category[0].toUpperCase() + category.slice(1);
      await tx.insert(units).values(
        Array.from({ length: unitCount }, (_, n) => ({
          propertyId: ks.id,
          roomTypeId: roomType.id,
          name: unitCount === 1 ? stay.name : `${unitName} ${n + 1}`,
          sortOrder: n,
        })),
      );

      // Weekday nights include breakfast; Friday and Saturday nights breakfast and one main meal.
      const plans: [("weekday" | "weekend" | "any"), RatePlan | undefined, "CP" | "MAP"][] = stay.everyDay
        ? [["any", stay.everyDay, "MAP"]]
        : [
            ["weekday", stay.weekday, "CP"],
            ["weekend", stay.weekend, "MAP"],
          ];
      for (const [dayKind, rate, mealPlan] of plans) {
        if (!rate) continue;
        const [row] = await tx
          .insert(rates)
          .values({
            propertyId: ks.id,
            roomTypeId: roomType.id,
            dayKind,
            basis: rate.basis === "per person" ? "person" : "room",
            basePaise: rupees(rate.base),
            extraAdultPaise: rate.extraPerson === undefined ? null : rupees(rate.extraPerson),
            mealPlan,
          })
          .returning({ id: rates.id });
        await tx.insert(rateChildPrices).values([
          { rateId: row.id, ageBandId: band("child_5_11"), paise: rupees(rate.child5to11) },
          { rateId: row.id, ageBandId: band("child_3_5"), paise: rupees(rate.child3to5) },
        ]);
      }
    }

    // Day packages: sold per guest per day. Capacity is not published, so it starts at 0 until staff set it.
    const time = (hours: number) => `${String(Math.floor(hours)).padStart(2, "0")}:${hours % 1 ? "30" : "00"}`;
    for (const [i, pkg] of ksDayPackages.entries()) {
      const code = pkg.name.toLowerCase().replace(/\s+/g, "-");
      const [existing] = await tx.select({ id: offerings.id }).from(offerings).where(and(eq(offerings.propertyId, ks.id), eq(offerings.code, code)));
      if (existing) continue;
      const [offering] = await tx
        .insert(offerings)
        .values({ propertyId: ks.id, kind: "day_package", code, name: pkg.name, summary: pkg.meals, adultPaise: rupees(pkg.adult), sortOrder: i })
        .returning({ id: offerings.id });
      await tx.insert(offeringChildPrices).values([
        { offeringId: offering.id, ageBandId: band("child_5_11"), paise: rupees(pkg.child5to11) },
        { offeringId: offering.id, ageBandId: band("child_3_5"), paise: rupees(pkg.child3to5) },
      ]);
      await tx.insert(offeringSlots).values({
        propertyId: ks.id,
        offeringId: offering.id,
        label: pkg.hours,
        startsAt: time(pkg.start),
        endsAt: time(pkg.end),
        defaultCapacity: 0,
      });
    }
  }
});

const counts = await Promise.all(
  [properties, roles, rolePermissions, roomTypes, units, rates, offerings, staffMembers].map(async (table) => (await db.$count(table)).toString()),
);
console.log(
  `Seeded: ${counts[0]} resorts, ${counts[1]} roles (${counts[2]} permissions), ${counts[3]} room types, ${counts[4]} units, ${counts[5]} rates, ${counts[6]} offerings, ${counts[7]} staff.`,
);
await db.pool.end();

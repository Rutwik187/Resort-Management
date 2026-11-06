import { and, eq, isNull } from "drizzle-orm";
import { databaseUrl } from "./env";
import { ageBands, createDb, offeringChildPrices, offerings, offeringSlots, properties, rateChildPrices, rates, roomTypes, units } from "../src";

/*
 * Brings each resort website's rooms, rates and day packages into the admin
 * (docs/implementation-plan.md, section 10). It reads each site's
 * src/content/booking.ts: the shape the booking widget reads, the same for
 * all four sites. Safe to run again: it adds what is missing and fills
 * website text that is still empty, and never overwrites a change staff
 * made in the admin. Prices the site doesn't publish stay unpublished.
 *
 *   pnpm --filter @repo/db db:import-sites
 */

/** The widget's shapes, as far as this script reads them. */
type Rate = { basis?: "couple" | "person"; base: number; extraAdult?: number; child5to11?: number; child3to5?: number; meals?: string };
type Listing = {
  id: string;
  name: string;
  noun: string;
  line: string;
  details?: string;
  features?: string[];
  minGuests?: number;
  maxGuests?: number;
  units?: number;
  weekday?: Rate;
  weekend?: Rate;
  everyNight?: Rate;
};
type Group = { id: string; listings: Listing[] };
type Pass = { id: string; name: string; hours: string; meals: string; adult: number; child5to11: number; child3to5: number };

const sites = [
  { code: "KS", app: "khed-shivapur" },
  { code: "GC", app: "go-crazy" },
  { code: "SB", app: "sinhagad-bliss" },
  { code: "PV", app: "valley" },
] as const;

const db = createDb(databaseUrl(), 1);
const paise = (rupees: number) => Math.round(rupees * 100);
const category = (noun: string) =>
  noun === "cottage" || noun === "villa" || noun === "tent" || noun === "dormitory" ? noun : noun === "package" ? "other" : "room";
/** The meal plan a site's words describe: all meals, breakfast and one meal, breakfast, or room only. */
const mealPlan = (meals?: string) =>
  !meals ? "EP" : /all meals|full board|lunch, hi-tea and dinner/i.test(meals) ? "AP" : /one main meal|breakfast and (lunch|dinner)/i.test(meals) ? "MAP" : /breakfast/i.test(meals) ? "CP" : /meals/i.test(meals) ? "AP" : "EP";
/** "9:00 am to 6:00 pm" gives 09:00 and 18:00. */
const times = (hours: string) => {
  const clock = [...hours.matchAll(/(\d{1,2}):(\d{2})\s*(am|pm)/gi)].map(([, h, m, half]) => {
    const hour = (Number(h) % 12) + (half.toLowerCase() === "pm" ? 12 : 0);
    return `${String(hour).padStart(2, "0")}:${m}`;
  });
  return { startsAt: clock[0] ?? null, endsAt: clock[1] ?? null };
};

for (const site of sites) {
  const content = new URL(`../../../apps/${site.app}/src/content/booking.ts`, import.meta.url).href;
  const mod = (await import(content)) as { stayGroups?: Group[]; passes?: Pass[]; dayPasses?: Pass[] };
  const summary = { added: 0, filled: 0, units: 0, rates: 0, passes: 0 };

  await db.transaction(async (tx) => {
    const [property] = await tx.select({ id: properties.id }).from(properties).where(eq(properties.code, site.code));
    if (!property) throw new Error(`Run db:seed first: there is no resort ${site.code}.`);
    const bands = await tx.select({ id: ageBands.id, code: ageBands.code }).from(ageBands).where(eq(ageBands.propertyId, property.id));
    const band = (code: string) => bands.find((b) => b.code === code)?.id;

    let order = 0;
    for (const group of mod.stayGroups ?? []) {
      for (const listing of group.listings) {
        order += 1;
        const plan = listing.weekday ?? listing.weekend ?? listing.everyNight;
        const perPerson = plan?.basis === "person";
        const maxGuests = listing.maxGuests ?? null;
        const [existing] = await tx.select().from(roomTypes).where(and(eq(roomTypes.propertyId, property.id), eq(roomTypes.code, listing.id)));

        let roomTypeId: string;
        if (existing) {
          // Fill only what is still empty, so staff's own text stays.
          const fill = {
            ...(existing.tagline === null && listing.line ? { tagline: listing.line } : {}),
            ...(existing.description === null && listing.details ? { description: listing.details } : {}),
            ...(existing.features.length === 0 && listing.features?.length ? { features: listing.features } : {}),
            ...(existing.webGroup === null ? { webGroup: group.id } : {}),
          };
          if (Object.keys(fill).length) {
            await tx.update(roomTypes).set(fill).where(eq(roomTypes.id, existing.id));
            summary.filled += 1;
          }
          roomTypeId = existing.id;
        } else {
          const baseOccupancy = perPerson ? 1 : Math.min(2, maxGuests ?? 2);
          const [created] = await tx
            .insert(roomTypes)
            .values({
              propertyId: property.id,
              code: listing.id,
              name: listing.name,
              category: category(listing.noun),
              baseOccupancy,
              minGuests: listing.minGuests ?? 1,
              maxAdults: maxGuests,
              maxChildren: maxGuests ? Math.max(0, maxGuests - 1) : 0,
              maxGuests,
              tagline: listing.line || null,
              description: listing.details ?? null,
              features: listing.features ?? [],
              webGroup: group.id,
              sortOrder: order,
            })
            .returning({ id: roomTypes.id });
          roomTypeId = created.id;
          summary.added += 1;

          // The rooms themselves, only where the site gives a count.
          if (listing.units) {
            const kind = category(listing.noun);
            const word = kind === "room" || kind === "other" ? "Room" : kind[0].toUpperCase() + kind.slice(1);
            await tx.insert(units).values(
              Array.from({ length: listing.units }, (_, n) => ({
                propertyId: property.id,
                roomTypeId,
                name: listing.units === 1 ? listing.name : `${word} ${n + 1}`,
                sortOrder: n,
              })),
            );
            summary.units += listing.units;
          }
        }

        // Base rates, only for a room type that has none yet.
        const [anyRate] = await tx.select({ id: rates.id }).from(rates).where(and(eq(rates.roomTypeId, roomTypeId), isNull(rates.seasonId))).limit(1);
        if (anyRate) continue;
        const published: ["weekday" | "weekend" | "any", Rate | undefined][] = [
          ["weekday", listing.weekday],
          ["weekend", listing.weekend],
          ["any", listing.everyNight],
        ];
        for (const [dayKind, rate] of published) {
          if (!rate) continue;
          const [row] = await tx
            .insert(rates)
            .values({
              propertyId: property.id,
              roomTypeId,
              dayKind,
              basis: rate.basis === "person" ? "person" : "room",
              basePaise: paise(rate.base),
              extraAdultPaise: rate.extraAdult === undefined ? null : paise(rate.extraAdult),
              mealPlan: mealPlan(rate.meals),
            })
            .returning({ id: rates.id });
          const children = [
            [band("child_5_11"), rate.child5to11],
            [band("child_3_5"), rate.child3to5],
          ].filter((entry): entry is [string, number] => entry[0] !== undefined && entry[1] !== undefined);
          if (children.length) await tx.insert(rateChildPrices).values(children.map(([ageBandId, amount]) => ({ rateId: row.id, ageBandId, paise: paise(amount) })));
          summary.rates += 1;
        }
      }
    }

    // Day packages. Seats a day aren't published, so they start at 0 until staff set them.
    for (const [i, pass] of (mod.passes ?? mod.dayPasses ?? []).entries()) {
      const [existing] = await tx.select().from(offerings).where(and(eq(offerings.propertyId, property.id), eq(offerings.code, pass.id)));
      if (existing) {
        // The first import kept only the meals; the site also names the kitchen. Add it if staff haven't changed the text.
        if (existing.summary && pass.meals !== existing.summary && pass.meals.startsWith(existing.summary)) {
          await tx.update(offerings).set({ summary: pass.meals }).where(eq(offerings.id, existing.id));
          summary.filled += 1;
        }
        continue;
      }
      const [offering] = await tx
        .insert(offerings)
        .values({ propertyId: property.id, kind: "day_package", code: pass.id, name: pass.name, summary: pass.meals, adultPaise: paise(pass.adult), sortOrder: i })
        .returning({ id: offerings.id });
      const children = [
        [band("child_5_11"), pass.child5to11],
        [band("child_3_5"), pass.child3to5],
      ].filter((entry): entry is [string, number] => entry[0] !== undefined && entry[1] !== undefined);
      if (children.length) await tx.insert(offeringChildPrices).values(children.map(([ageBandId, amount]) => ({ offeringId: offering.id, ageBandId, paise: paise(amount) })));
      await tx.insert(offeringSlots).values({ propertyId: property.id, offeringId: offering.id, label: pass.hours, ...times(pass.hours), defaultCapacity: 0 });
      summary.passes += 1;
    }
  });

  console.log(`${site.code}: ${summary.added} room types added (${summary.units} rooms, ${summary.rates} rates), ${summary.filled} filled in, ${summary.passes} day packages added.`);
}

await db.pool.end();

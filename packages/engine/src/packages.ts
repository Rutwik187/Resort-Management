import { and, count, eq, inArray, notInArray } from "drizzle-orm";
import { bookingItems, bookings, stayPackageChildPrices, stayPackages, type Executor } from "@repo/db";
import { addDays, dayOfWeek } from "./dates";
import type { AgeBand, NightPrice, Party } from "./pricing";

/*
 * Stay, staycation and custom packages (URD 5.3, PKG-01): a room of a linked
 * room type for a fixed or bounded number of nights, at the package's own
 * price. The room comes from the room type's units, so a package never
 * oversells. Prices follow the package's basis: each adult, a couple, or
 * the room at its base occupancy, plus extra adults and children by band.
 */

export type StayPackage = typeof stayPackages.$inferSelect;

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Why a package can't be booked in this room type for these dates, in words, or null when it can. */
export function packageProblem(pkg: Pick<StayPackage, "name" | "active" | "roomTypeIds" | "nights" | "minNights" | "maxNights" | "arrivalDays" | "validFrom" | "validTo" | "blackoutDates">, roomTypeId: string, checkIn: string, nightCount: number): string | null {
  if (!pkg.active) return `${pkg.name} isn't on sale.`;
  if (!pkg.roomTypeIds.includes(roomTypeId)) return `${pkg.name} isn't sold in this room.`;
  if (pkg.validFrom && checkIn < pkg.validFrom) return `${pkg.name} starts on ${pkg.validFrom}.`;
  if (pkg.validTo && checkIn > pkg.validTo) return `${pkg.name} ended on ${pkg.validTo}.`;
  if (pkg.blackoutDates.includes(checkIn)) return `${pkg.name} isn't sold for arrivals on ${checkIn}.`;
  if (pkg.arrivalDays?.length && !pkg.arrivalDays.includes(dayOfWeek(checkIn))) {
    return `${pkg.name} starts on ${pkg.arrivalDays.map((d) => weekdayNames[d]).join(" or ")} only.`;
  }
  if (pkg.nights && nightCount !== pkg.nights) return `${pkg.name} is for ${plural(pkg.nights, "night")}.`;
  if (pkg.minNights && nightCount < pkg.minNights) return `${pkg.name} needs at least ${plural(pkg.minNights, "night")}.`;
  if (pkg.maxNights && nightCount > pkg.maxNights) return `${pkg.name} is for at most ${plural(pkg.maxNights, "night")}.`;
  return null;
}

/**
 * The price of one package for one party, spread evenly over its nights so
 * GST can be worked out per night. Null when the package doesn't publish a
 * price someone in the party needs, such as an extra adult or a child band.
 */
export function pricePackage(
  pkg: Pick<StayPackage, "name" | "basis" | "priceUnit" | "pricePaise" | "extraAdultPaise">,
  childPaise: Record<string, number>,
  bands: readonly AgeBand[],
  party: Party,
  nights: string[],
  baseOccupancy: number,
): { totalPaise: number | null; nights: NightPrice[] } {
  const covered = pkg.basis === "person" ? 0 : pkg.basis === "couple" ? 2 : Math.max(1, baseOccupancy);
  let unit: number | null = pkg.basis === "person" ? party.adults * pkg.pricePaise : pkg.pricePaise;
  const extra = pkg.basis === "person" ? 0 : Math.max(0, party.adults - covered);
  if (extra > 0) unit = pkg.extraAdultPaise === null ? null : unit + extra * pkg.extraAdultPaise;
  for (const [code, n] of Object.entries(party.children)) {
    if (!n || unit === null) continue;
    const band = bands.find((b) => b.code === code);
    if (!band) unit = null;
    else if (!band.free) unit = childPaise[band.id] === undefined ? null : unit + n * childPaise[band.id];
  }
  const total = unit === null ? null : pkg.priceUnit === "night" ? unit * nights.length : unit;
  const source = `Package: ${pkg.name}`;
  if (total === null) return { totalPaise: null, nights: nights.map((night) => ({ night, source, paise: null })) };
  const each = Math.floor(total / nights.length);
  return {
    totalPaise: total,
    nights: nights.map((night, i) => ({ night, source, paise: i === nights.length - 1 ? total - each * (nights.length - 1) : each })),
  };
}

/** A package with its child prices by age band id. */
export async function loadPackage(db: Executor, propertyId: string, packageId: string) {
  const [pkg] = await db.select().from(stayPackages).where(and(eq(stayPackages.id, packageId), eq(stayPackages.propertyId, propertyId)));
  if (!pkg) return null;
  const children = await db.select().from(stayPackageChildPrices).where(eq(stayPackageChildPrices.packageId, pkg.id));
  return { pkg, childPaise: Object.fromEntries(children.map((c) => [c.ageBandId, c.paise])) };
}

/** How many of a package already arrive on a day, in bookings that still count. */
export async function packageArrivals(db: Executor, packageId: string, checkIn: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .where(and(eq(bookingItems.packageId, packageId), eq(bookings.checkIn, checkIn), notInArray(bookings.status, ["cancelled", "expired", "no_show", "refunded"])));
  return n;
}

/** The package's nights for a check-in, when it fixes them. */
export const packageCheckOut = (pkg: Pick<StayPackage, "nights">, checkIn: string) => (pkg.nights ? addDays(checkIn, pkg.nights) : null);

/** Several packages by id at once, for a page or a check. */
export async function packagesByIds(db: Executor, ids: string[]) {
  return ids.length ? db.select().from(stayPackages).where(inArray(stayPackages.id, ids)) : [];
}

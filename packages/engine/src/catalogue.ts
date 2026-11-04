import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { ageBands, dateRates, properties, rateChildPrices, rates, roomTypes, seasons, type Executor } from "@repo/db";
import type { AgeBand, Rate, RoomPricing } from "./pricing";

export type RoomTypeInfo = {
  id: string;
  propertyId: string;
  code: string;
  name: string;
  baseOccupancy: number;
  minGuests: number;
  maxAdults: number;
  maxChildren: number;
  maxGuests: number;
  extraBedAllowed: boolean;
};

/** The resort's age bands, in order. */
export async function loadBands(db: Executor, propertyId: string): Promise<AgeBand[]> {
  return db
    .select({ id: ageBands.id, code: ageBands.code, free: ageBands.free })
    .from(ageBands)
    .where(eq(ageBands.propertyId, propertyId))
    .orderBy(ageBands.sortOrder);
}

/**
 * Everything to price some room types over a range of nights, in a few
 * queries: the room types, the resort's weekend nights and bands, base and
 * season rates with their child prices, and any date prices in the range.
 */
export async function loadRoomPricing(
  db: Executor,
  propertyId: string,
  roomTypeIds: string[],
  range: { from: string; to: string },
): Promise<Map<string, { roomType: RoomTypeInfo; pricing: RoomPricing }>> {
  const result = new Map<string, { roomType: RoomTypeInfo; pricing: RoomPricing }>();
  if (roomTypeIds.length === 0) return result;

  const [property] = await db.select({ weekendNights: properties.weekendNights }).from(properties).where(eq(properties.id, propertyId));
  // One query after another: inside a transaction they share one connection.
  const types = await db
    .select({
      id: roomTypes.id,
      propertyId: roomTypes.propertyId,
      code: roomTypes.code,
      name: roomTypes.name,
      baseOccupancy: roomTypes.baseOccupancy,
      minGuests: roomTypes.minGuests,
      maxAdults: roomTypes.maxAdults,
      maxChildren: roomTypes.maxChildren,
      maxGuests: roomTypes.maxGuests,
      extraBedAllowed: roomTypes.extraBedAllowed,
    })
    .from(roomTypes)
    .where(and(eq(roomTypes.propertyId, propertyId), inArray(roomTypes.id, roomTypeIds)));
  const bands = await loadBands(db, propertyId);
  const rateRows = await db.select().from(rates).where(inArray(rates.roomTypeId, roomTypeIds));
  const seasonRows = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.propertyId, propertyId), lt(seasons.startsOn, range.to), gte(seasons.endsOn, range.from)));
  const dateRows = await db
    .select({ roomTypeId: dateRates.roomTypeId, night: dateRates.night, basePaise: dateRates.basePaise })
    .from(dateRates)
    .where(and(inArray(dateRates.roomTypeId, roomTypeIds), gte(dateRates.night, range.from), lt(dateRates.night, range.to)));

  const childRows = rateRows.length
    ? await db.select().from(rateChildPrices).where(inArray(rateChildPrices.rateId, rateRows.map((r) => r.id)))
    : [];
  const toRate = (row: (typeof rateRows)[number]): Rate => ({
    dayKind: row.dayKind,
    basis: row.basis,
    basePaise: row.basePaise,
    extraAdultPaise: row.extraAdultPaise,
    extraBedPaise: row.extraBedPaise,
    childPaise: Object.fromEntries(childRows.filter((c) => c.rateId === row.id).map((c) => [c.ageBandId, c.paise])),
  });

  for (const roomType of types) {
    const own = rateRows.filter((r) => r.roomTypeId === roomType.id);
    result.set(roomType.id, {
      roomType,
      pricing: {
        baseOccupancy: roomType.baseOccupancy,
        weekendNights: property?.weekendNights ?? [5, 6],
        bands,
        baseRates: own.filter((r) => r.seasonId === null).map(toRate),
        seasons: seasonRows
          .map((season) => ({ ...season, rates: own.filter((r) => r.seasonId === season.id).map(toRate) }))
          .filter((season) => season.rates.length > 0),
        dateRates: new Map(dateRows.filter((d) => d.roomTypeId === roomType.id).map((d) => [d.night, d.basePaise])),
      },
    });
  }
  return result;
}

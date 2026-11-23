import { and, asc, eq, inArray } from "drizzle-orm";
import { offeringChildPrices, offerings, properties, roomTypes, units, type Database } from "@repo/db";
import { searchStays, seatsLeft } from "./availability";
import { loadBands, loadRoomPricing } from "./catalogue";
import { isDate, nightsOf } from "./dates";
import { priceOffering, priceStay } from "./pricing";

/*
 * The group site's search (URD 4.1, BW-03): what is free at every resort,
 * or one, for a stay or a day, with the price for the party, sorted by
 * resort. Read live, never cached. Booking and payment happen on the
 * resort's own site (PAY-04), so each result carries the resort's code;
 * one booking belongs to one resort (BK-08).
 */

export type GroupStayResult = {
  propertyCode: string;
  propertyName: string;
  options: { code: string; name: string; free: number; totalPaise: number | null; note: string | null }[];
};

export type GroupDayResult = {
  propertyCode: string;
  propertyName: string;
  options: { code: string; name: string; slot: string; left: number | null; totalPaise: number | null; note: string | null }[];
};

/** Free rooms at each resort for a stay, each priced for one room of `adults` and `children` (children 5 to 11). */
export async function groupStaySearch(db: Database, input: { checkIn: string; checkOut: string; adults: number; children: number; propertyCode?: string }): Promise<GroupStayResult[]> {
  if (!isDate(input.checkIn) || !isDate(input.checkOut) || input.checkOut <= input.checkIn) return [];
  const nights = nightsOf(input.checkIn, input.checkOut);
  if (nights.length > 30) return [];
  const resorts = await db.select().from(properties).where(and(eq(properties.active, true), input.propertyCode ? eq(properties.code, input.propertyCode) : undefined)).orderBy(asc(properties.sortOrder));
  const results: GroupStayResult[] = [];
  for (const resort of resorts) {
    const options = await searchStays(db, resort.id, input.checkIn, input.checkOut);
    const shown = await db
      .select({ id: roomTypes.id, units: units.id })
      .from(roomTypes)
      .innerJoin(units, and(eq(units.roomTypeId, roomTypes.id), eq(units.status, "active")))
      .where(and(eq(roomTypes.propertyId, resort.id), eq(roomTypes.onWebsite, true), eq(roomTypes.status, "active")));
    const ids = [...new Set(shown.map((s) => s.id))];
    const own = options.filter((o) => ids.includes(o.roomTypeId));
    if (!own.length) continue;
    const pricing = await loadRoomPricing(db, resort.id, ids, { from: input.checkIn, to: input.checkOut });
    const bands = await loadBands(db, resort.id);
    const childBand = bands.find((b) => b.code === "child_5_11");
    const party = { adults: input.adults, children: input.children && childBand ? { [childBand.code]: input.children } : {} };
    results.push({
      propertyCode: resort.code,
      propertyName: resort.name,
      options: own
        .map((o) => {
          const loaded = pricing.get(o.roomTypeId);
          const fits = loaded && (loaded.roomType.maxGuests === null || input.adults + input.children <= loaded.roomType.maxGuests);
          const price = loaded && fits && (!input.children || childBand) ? priceStay(loaded.pricing, nights, party, 0).totalPaise : null;
          return {
            code: o.code,
            name: o.name,
            free: o.closedReason ? 0 : o.freeUnits,
            totalPaise: price,
            note: o.closedReason ?? (loaded && !fits ? `Takes at most ${loaded.roomType.maxGuests} guests a room.` : null),
          };
        })
        .sort((a, b) => Number(b.free > 0) - Number(a.free > 0) || (a.totalPaise ?? Infinity) - (b.totalPaise ?? Infinity)),
    });
  }
  return results;
}

/** Day packages at each resort for one day, with places left and the price for the party. */
export async function groupDaySearch(db: Database, input: { day: string; adults: number; children: number; propertyCode?: string }): Promise<GroupDayResult[]> {
  if (!isDate(input.day)) return [];
  const resorts = await db.select().from(properties).where(and(eq(properties.active, true), input.propertyCode ? eq(properties.code, input.propertyCode) : undefined)).orderBy(asc(properties.sortOrder));
  const results: GroupDayResult[] = [];
  for (const resort of resorts) {
    const seats = (await seatsLeft(db, resort.id, input.day)).filter((s) => s.kind === "day_package");
    if (!seats.length) continue;
    const bands = await loadBands(db, resort.id);
    const childBand = bands.find((b) => b.code === "child_5_11");
    const party = { adults: input.adults, children: input.children && childBand ? { [childBand.code]: input.children } : {} };
    const rows = await db.select().from(offerings).where(inArray(offerings.id, [...new Set(seats.map((s) => s.offeringId))]));
    const children = await db.select().from(offeringChildPrices).where(inArray(offeringChildPrices.offeringId, rows.map((r) => r.id)));
    const seen = new Set<string>();
    const options: GroupDayResult["options"] = [];
    for (const seat of seats) {
      if (seen.has(seat.offeringId)) continue;
      seen.add(seat.offeringId);
      const offering = rows.find((r) => r.id === seat.offeringId)!;
      const childPaise = Object.fromEntries(children.filter((c) => c.offeringId === offering.id).map((c) => [c.ageBandId, c.paise]));
      const known = seat.setForDay || seat.capacity > 0;
      options.push({
        code: offering.code,
        name: offering.name,
        slot: seat.slotLabel,
        left: known ? (seat.closedReason ? 0 : seat.left) : null,
        totalPaise: priceOffering({ adultPaise: offering.adultPaise, childPaise }, bands, party),
        note: seat.closedReason,
      });
    }
    results.push({ propertyCode: resort.code, propertyName: resort.name, options });
  }
  return results;
}

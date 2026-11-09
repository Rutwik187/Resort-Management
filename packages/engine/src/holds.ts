import { and, eq, gte, inArray, lt, sql, TransactionRollbackError } from "drizzle-orm";
import {
  capacityDays,
  capacityHolds,
  holds,
  inventoryLog,
  offeringChildPrices,
  offerings,
  offeringSlots,
  properties,
  stayRules,
  unitNights,
  units,
  type Database,
  type Executor,
} from "@repo/db";
import { addonQuantityWords, priceAddons, type AddonQuoteLine, type AddonRequest } from "./addons";
import { freeUnits, stayRuleProblem } from "./availability";
import { loadBands, loadRoomPricing } from "./catalogue";
import { isDate, nightsOf } from "./dates";
import { NotFoundError, RuleError, SoldOutError, isCheckViolation, isUniqueViolation } from "./errors";
import { headcount, payingGuests, priceOffering, priceStay, type NightPrice, type Party } from "./pricing";
import { loadTaxRules, taxQuote, type TaxPart } from "./tax";

/*
 * Holds keep rooms or seats for a guest while they pay (INV-03). Each hold
 * is one transaction: it clears holds that have run out on those nights,
 * then takes free units night by night. If another guest's transaction took
 * the same unit and night a moment earlier, the database refuses the row
 * and the engine tries the next free unit, or reports sold out. So two
 * guests paying at the same second can't both get the last room.
 */

export type StayRequest = { roomTypeId: string; party: Party; extraBeds?: number };
/** Add-ons chosen with a hold. "website" lets only add-ons shown on the website through. */
type WithAddons = { addons?: AddonRequest[]; website?: boolean };
export type StayInput = { propertyId: string; checkIn: string; checkOut: string; rooms: StayRequest[]; minutes?: number } & WithAddons;

export type StayQuoteLine = {
  kind: "stay";
  roomTypeId: string;
  roomTypeName: string;
  unitId: string;
  unitName: string;
  party: Party;
  extraBeds: number;
  nights: NightPrice[];
  totalPaise: number | null;
};

export type OfferingQuoteLine = {
  kind: "offering";
  offeringId: string;
  offeringName: string;
  slotId: string;
  slotLabel: string;
  day: string;
  party: Party;
  totalPaise: number | null;
};

export type QuoteLine = StayQuoteLine | OfferingQuoteLine | AddonQuoteLine;

/** A quote line in words, such as "Deluxe Room", "Day picnic, Morning" or "BBQ dinner (4 people)". */
export function lineTitle(line: QuoteLine) {
  if (line.kind === "stay") return line.roomTypeName;
  if (line.kind === "offering") return `${line.offeringName}, ${line.slotLabel}`;
  return `${line.addonName} (${addonQuantityWords(line)})`;
}

/** The priced hold, saved with it. The amount charged comes only from this (PR-08). */
export type Quote = {
  currency: "INR";
  checkIn?: string;
  checkOut?: string;
  day?: string;
  lines: QuoteLine[];
  /** The lines' prices before GST. Null when any line has a rate still to be confirmed. */
  subtotalPaise?: number | null;
  /** GST on the subtotal. Null when a rate or a GST rule is missing. */
  taxPaise?: number | null;
  /** GST by rate. */
  tax?: TaxPart[];
  /** What the guest pays, GST included. Null when the subtotal or the GST is unknown. */
  totalPaise: number | null;
};

/** Adds GST to a quote's lines. Quotes saved before GST came in have no subtotal: their total had no GST. */
export async function withTax(db: Executor, propertyId: string, base: Omit<Quote, "subtotalPaise" | "taxPaise" | "tax" | "totalPaise">): Promise<Quote> {
  const subtotalPaise = total(base.lines);
  const taxed = subtotalPaise === null ? null : taxQuote(base, await loadTaxRules(db, propertyId));
  return { ...base, subtotalPaise, taxPaise: taxed?.taxPaise ?? null, tax: taxed?.parts ?? [], totalPaise: taxed?.totalPaise ?? null };
}

/** A quote's price before GST, for quotes saved before GST came in too. */
export const subtotalOf = (quote: Quote) => (quote.subtotalPaise === undefined ? quote.totalPaise : quote.subtotalPaise);

export type HoldResult = { holdId: string; expiresAt: Date; quote: Quote };

const total = (lines: { totalPaise: number | null }[]) =>
  lines.some((line) => line.totalPaise === null) ? null : lines.reduce((sum, line) => sum + (line.totalPaise ?? 0), 0);

async function holdMinutes(db: Executor, propertyId: string) {
  const [property] = await db.select({ minutes: properties.holdMinutes }).from(properties).where(eq(properties.id, propertyId));
  if (!property) throw new NotFoundError("Resort");
  return property.minutes;
}

/**
 * Holds one unit of each requested room type for every night of the stay,
 * and prices it. Throws RuleError when a stay rule says no, and
 * SoldOutError when a room type has no free unit left.
 */
export async function holdStay(db: Database, input: StayInput): Promise<HoldResult> {
  return db.transaction((tx) => holdStayIn(tx, input));
}

/** Prices a stay exactly as holdStay would, then lets it all go, so staff see the price and any problem before they book. */
export async function quoteStay(db: Database, input: StayInput): Promise<Quote> {
  return rolledBack(db, async (tx) => (await holdStayIn(tx, input)).quote);
}

export async function holdStayIn(tx: Tx, input: StayInput): Promise<HoldResult> {
  const nights = nightsOf(input.checkIn, input.checkOut);
  if (input.rooms.length === 0) throw new RuleError("Choose at least one room.");

  const roomTypeIds = [...new Set(input.rooms.map((room) => room.roomTypeId))];
  const priced = await loadRoomPricing(tx, input.propertyId, roomTypeIds, { from: input.checkIn, to: input.checkOut });
  if (priced.size !== roomTypeIds.length) throw new NotFoundError("Room type");

  // Stay rules and guest limits, before anything is taken.
  const rules = await tx
    .select()
    .from(stayRules)
    .where(and(inArray(stayRules.roomTypeId, roomTypeIds), gte(stayRules.night, input.checkIn), lt(stayRules.night, input.checkOut)));
  for (const room of input.rooms) {
    const { roomType, pricing } = priced.get(room.roomTypeId)!;
    const problem = stayRuleProblem(
      rules.filter((rule) => rule.roomTypeId === room.roomTypeId),
      input.checkIn,
      nights.length,
    );
    if (problem) throw new RuleError(`${roomType.name}: ${problem}`);
    const guests = headcount(room.party);
    if (room.party.adults < 1) throw new RuleError(`${roomType.name}: at least one adult stays in each room.`);
    if (roomType.maxGuests !== null && guests > roomType.maxGuests) throw new RuleError(`${roomType.name} takes at most ${roomType.maxGuests} guests.`);
    if (roomType.maxAdults !== null && room.party.adults > roomType.maxAdults) throw new RuleError(`${roomType.name} takes at most ${roomType.maxAdults} adults.`);
    if (payingGuests(room.party, pricing.bands) < roomType.minGuests) throw new RuleError(`${roomType.name} needs at least ${roomType.minGuests} guests.`);
    if ((room.extraBeds ?? 0) > 0 && !roomType.extraBedAllowed) throw new RuleError(`${roomType.name} has no extra beds.`);
  }

  // Holds that have run out free their nights now, so they never block this one.
  await tx.execute(sql`
    delete from ${unitNights} using ${holds}
    where ${unitNights.holdId} = ${holds.id}
      and ${holds.expiresAt} <= now()
      and ${unitNights.night} >= ${input.checkIn} and ${unitNights.night} < ${input.checkOut}
      and ${unitNights.unitId} in (select ${units.id} from ${units} where ${inArray(units.roomTypeId, roomTypeIds)})`);

  const minutes = input.minutes ?? (await holdMinutes(tx, input.propertyId));
  const [hold] = await tx
    .insert(holds)
    .values({ propertyId: input.propertyId, expiresAt: sql`now() + make_interval(mins => ${minutes})` })
    .returning({ id: holds.id, expiresAt: holds.expiresAt });

  const lines: StayQuoteLine[] = [];
  const taken: string[] = [];
  for (const room of input.rooms) {
    const { roomType, pricing } = priced.get(room.roomTypeId)!;
    const candidates = await freeUnits(tx, room.roomTypeId, input.checkIn, input.checkOut, taken);
    let unit: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      try {
        // A savepoint: a clash undoes only this unit's rows, and the next unit is tried.
        await tx.transaction(async (sp) => {
          await sp.insert(unitNights).values(nights.map((night) => ({ propertyId: input.propertyId, unitId: candidate.id, night, holdId: hold.id })));
        });
        unit = candidate;
        break;
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    if (!unit) throw new SoldOutError(`${roomType.name} is sold out for these dates.`);
    taken.push(unit.id);

    const price = priceStay(pricing, nights, room.party, room.extraBeds ?? 0);
    lines.push({
      kind: "stay",
      roomTypeId: roomType.id,
      roomTypeName: roomType.name,
      unitId: unit.id,
      unitName: unit.name,
      party: room.party,
      extraBeds: room.extraBeds ?? 0,
      nights: price.nights,
      totalPaise: price.totalPaise,
    });
    await tx.insert(inventoryLog).values({
      propertyId: input.propertyId,
      action: "hold",
      unitId: unit.id,
      fromDate: nights[0],
      toDate: nights[nights.length - 1],
      holdId: hold.id,
    });
  }

  const extras = await priceAddons(tx, input.propertyId, input.addons ?? [], { kind: "stay", date: input.checkIn, nights: nights.length }, input);
  const quote = await withTax(tx, input.propertyId, { currency: "INR", checkIn: input.checkIn, checkOut: input.checkOut, lines: [...lines, ...extras] });
  await tx.update(holds).set({ quote }).where(eq(holds.id, hold.id));
  return { holdId: hold.id, expiresAt: hold.expiresAt, quote };
}

export type SeatRequest = { slotId: string; party: Party };
export type SeatsInput = { propertyId: string; day: string; seats: SeatRequest[]; minutes?: number } & WithAddons;

/**
 * Holds seats for one day: day packages, activities or restaurant sittings
 * (INV-09). Each slot's day row keeps sold plus held within capacity, so a
 * full day refuses the hold even when many guests pay at once.
 */
export async function holdSeats(db: Database, input: SeatsInput): Promise<HoldResult> {
  return db.transaction((tx) => holdSeatsIn(tx, input));
}

/** Prices seats exactly as holdSeats would, then lets them go. */
export async function quoteSeats(db: Database, input: SeatsInput): Promise<Quote> {
  return rolledBack(db, async (tx) => (await holdSeatsIn(tx, input)).quote);
}

async function holdSeatsIn(tx: Tx, input: SeatsInput): Promise<HoldResult> {
  if (!isDate(input.day)) throw new RangeError("Choose a valid date.");
  if (input.seats.length === 0) throw new RuleError("Choose at least one ticket.");

  const slotIds = [...new Set(input.seats.map((seat) => seat.slotId))];
  const slots = await tx
    .select({
      slotId: offeringSlots.id,
      label: offeringSlots.label,
      defaultCapacity: offeringSlots.defaultCapacity,
      slotActive: offeringSlots.active,
      offeringId: offerings.id,
      offeringName: offerings.name,
      adultPaise: offerings.adultPaise,
      active: offerings.active,
      soldOn: offerings.soldOn,
      validFrom: offerings.validFrom,
      validTo: offerings.validTo,
    })
    .from(offeringSlots)
    .innerJoin(offerings, eq(offerings.id, offeringSlots.offeringId))
    .where(and(eq(offeringSlots.propertyId, input.propertyId), inArray(offeringSlots.id, slotIds)));
  if (slots.length !== slotIds.length) throw new NotFoundError("Ticket");

  const bands = await loadBands(tx, input.propertyId);
  const childPrices = await tx
    .select()
    .from(offeringChildPrices)
    .where(inArray(offeringChildPrices.offeringId, slots.map((s) => s.offeringId)));
  const weekday = new Date(`${input.day}T00:00:00Z`).getUTCDay();

  const minutes = input.minutes ?? (await holdMinutes(tx, input.propertyId));
  const [hold] = await tx
    .insert(holds)
    .values({ propertyId: input.propertyId, expiresAt: sql`now() + make_interval(mins => ${minutes})` })
    .returning({ id: holds.id, expiresAt: holds.expiresAt });

  const lines: OfferingQuoteLine[] = [];
  for (const seat of input.seats) {
    const slot = slots.find((s) => s.slotId === seat.slotId)!;
    if (!slot.active || !slot.slotActive) throw new RuleError(`${slot.offeringName} is not on sale.`);
    if (slot.soldOn?.length && !slot.soldOn.includes(weekday)) throw new RuleError(`${slot.offeringName} is not sold on that day of the week.`);
    if ((slot.validFrom && input.day < slot.validFrom) || (slot.validTo && input.day > slot.validTo)) throw new RuleError(`${slot.offeringName} is not sold on ${input.day}.`);
    const guests = headcount(seat.party);
    if (seat.party.adults < 1) throw new RuleError("Each ticket needs at least one adult.");

    // The day's row starts at the slot's usual capacity. Seats of holds that have run out go back first.
    await tx
      .insert(capacityDays)
      .values({ propertyId: input.propertyId, offeringId: slot.offeringId, slotId: slot.slotId, day: input.day, capacity: slot.defaultCapacity })
      .onConflictDoNothing();
    await releaseExpiredSeats(tx, slot.slotId, input.day);

    let updated: { held: number }[] = [];
    try {
      updated = await tx
        .update(capacityDays)
        .set({ held: sql`${capacityDays.held} + ${guests}` })
        .where(and(eq(capacityDays.slotId, slot.slotId), eq(capacityDays.day, input.day), sql`${capacityDays.sold} + ${capacityDays.held} + ${guests} <= ${capacityDays.capacity}`))
        .returning({ held: capacityDays.held });
    } catch (error) {
      if (!isCheckViolation(error)) throw error;
    }
    if (updated.length === 0) throw new SoldOutError(`${slot.offeringName}, ${slot.label}, is full on ${input.day}.`);

    await tx
      .insert(capacityHolds)
      .values({ holdId: hold.id, slotId: slot.slotId, day: input.day, guests })
      .onConflictDoUpdate({ target: [capacityHolds.holdId, capacityHolds.slotId, capacityHolds.day], set: { guests: sql`${capacityHolds.guests} + ${guests}` } });
    await tx.insert(inventoryLog).values({ propertyId: input.propertyId, action: "hold", slotId: slot.slotId, fromDate: input.day, toDate: input.day, holdId: hold.id, data: { guests } });

    const childPaise = Object.fromEntries(childPrices.filter((c) => c.offeringId === slot.offeringId).map((c) => [c.ageBandId, c.paise]));
    lines.push({
      kind: "offering",
      offeringId: slot.offeringId,
      offeringName: slot.offeringName,
      slotId: slot.slotId,
      slotLabel: slot.label,
      day: input.day,
      party: seat.party,
      totalPaise: priceOffering({ adultPaise: slot.adultPaise, childPaise }, bands, seat.party),
    });
  }

  const extras = await priceAddons(tx, input.propertyId, input.addons ?? [], { kind: "day", date: input.day, nights: 1 }, input);
  const quote = await withTax(tx, input.propertyId, { currency: "INR", day: input.day, lines: [...lines, ...extras] });
  await tx.update(holds).set({ quote }).where(eq(holds.id, hold.id));
  return { holdId: hold.id, expiresAt: hold.expiresAt, quote };
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Runs work in a transaction and undoes all of it, returning what the work returned. */
async function rolledBack<T>(db: Database, work: (tx: Tx) => Promise<T>): Promise<T> {
  let result: T | undefined;
  try {
    await db.transaction(async (tx) => {
      result = await work(tx);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  return result as T;
}

/** Gives back the seats of holds that have run out on one slot and day. */
export async function releaseExpiredSeats(tx: Tx, slotId: string, day: string) {
  const freed = await tx.execute<{ guests: number }>(sql`
    with gone as (
      delete from ${capacityHolds} using ${holds}
      where ${capacityHolds.holdId} = ${holds.id} and ${holds.expiresAt} <= now() and ${holds.status} = 'active'
        and ${capacityHolds.slotId} = ${slotId} and ${capacityHolds.day} = ${day}
      returning ${capacityHolds.guests}
    )
    select coalesce(sum(guests), 0)::int as guests from gone`);
  const guests = freed.rows[0]?.guests ?? 0;
  if (guests > 0) {
    await tx
      .update(capacityDays)
      .set({ held: sql`${capacityDays.held} - ${guests}` })
      .where(and(eq(capacityDays.slotId, slotId), eq(capacityDays.day, day)));
  }
}

/** Lets go of a hold at once: the guest left, or payment failed. */
export async function releaseHold(db: Database, holdId: string) {
  await db.transaction(async (tx) => {
    const [hold] = await tx.select().from(holds).where(eq(holds.id, holdId)).for("update");
    if (!hold || hold.status !== "active") return;
    await freeHoldStock(tx, holdId);
    await tx.update(holds).set({ status: "released" }).where(eq(holds.id, holdId));
  });
}

/** Removes a hold's rooms and gives back its seats. */
export async function freeHoldStock(tx: Tx, holdId: string) {
  const rooms = await tx.delete(unitNights).where(eq(unitNights.holdId, holdId)).returning({ propertyId: unitNights.propertyId, unitId: unitNights.unitId, night: unitNights.night });
  const seats = await tx.delete(capacityHolds).where(eq(capacityHolds.holdId, holdId)).returning();
  for (const seat of seats) {
    await tx
      .update(capacityDays)
      .set({ held: sql`greatest(${capacityDays.held} - ${seat.guests}, 0)` })
      .where(and(eq(capacityDays.slotId, seat.slotId), eq(capacityDays.day, seat.day)));
  }
  for (const unitId of new Set(rooms.map((r) => r.unitId))) {
    const own = rooms.filter((r) => r.unitId === unitId).map((r) => r.night).sort();
    await tx.insert(inventoryLog).values({ propertyId: rooms[0].propertyId, action: "release", unitId, fromDate: own[0], toDate: own[own.length - 1], holdId });
  }
  return { rooms, seats };
}


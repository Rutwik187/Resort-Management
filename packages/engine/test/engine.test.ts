import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  ageBands,
  bookingEvents,
  bookings,
  capacityDays,
  holds,
  offeringChildPrices,
  offerings,
  offeringSlots,
  properties,
  rateChildPrices,
  rates,
  roomTypes,
  stayRules,
  unitNights,
  units,
  type Database,
} from "@repo/db";
import { createTestDatabase } from "@repo/db/testing";
import {
  changeBookingStatus,
  confirmBooking,
  createBlock,
  createBooking,
  expireHolds,
  holdSeats,
  holdStay,
  liftBlock,
  RuleError,
  searchStays,
  SoldOutError,
  TransitionError,
} from "../src";

/*
 * These run against a real Postgres database, made fresh for this file
 * (packages/db/src/testing.ts), because the rules that stop double booking
 * live in the database itself.
 */

let db: Database;
let drop: () => Promise<void>;
let propertyId: string;
let lastRoomId: string; // one unit only
let pairId: string; // two units
let lunchSlotId: string; // a restaurant sitting with 10 seats
let child511: string;

const couple = { adults: 2, children: {} };

beforeAll(async () => {
  ({ db, drop } = await createTestDatabase());
  [{ id: propertyId }] = await db.insert(properties).values({ code: "KS", name: "Prathamesh Resorts" }).returning({ id: properties.id });
  const bands = await db
    .insert(ageBands)
    .values([
      { propertyId, code: "infant", label: "Under 3", minAge: 0, maxAge: 2, free: true },
      { propertyId, code: "child_5_11", label: "5 to 11", minAge: 5, maxAge: 11 },
    ])
    .returning();
  child511 = bands.find((b) => b.code === "child_5_11")!.id;

  const types = await db
    .insert(roomTypes)
    .values([
      { propertyId, code: "glass-house", name: "Riverside Glass House", maxAdults: 4, maxGuests: 5, sortOrder: 1 },
      { propertyId, code: "cottage", name: "Chira Cottage", category: "cottage", maxAdults: 4, maxGuests: 4, sortOrder: 2 },
    ])
    .returning();
  lastRoomId = types[0].id;
  pairId = types[1].id;
  await db.insert(units).values([
    { propertyId, roomTypeId: lastRoomId, name: "Glass House 1" },
    { propertyId, roomTypeId: pairId, name: "Cottage 1", sortOrder: 1 },
    { propertyId, roomTypeId: pairId, name: "Cottage 2", sortOrder: 2 },
  ]);
  for (const roomTypeId of [lastRoomId, pairId]) {
    const created = await db
      .insert(rates)
      .values([
        { propertyId, roomTypeId, dayKind: "weekday", basePaise: 500_000, extraAdultPaise: 150_000 },
        { propertyId, roomTypeId, dayKind: "weekend", basePaise: 800_000, extraAdultPaise: 200_000 },
      ])
      .returning();
    await db.insert(rateChildPrices).values(created.map((rate) => ({ rateId: rate.id, ageBandId: child511, paise: 80_000 })));
  }

  const [lunch] = await db
    .insert(offerings)
    .values({ propertyId, kind: "dining", code: "sunday-lunch", name: "Sunday lunch", adultPaise: 60_000 })
    .returning();
  await db.insert(offeringChildPrices).values({ offeringId: lunch.id, ageBandId: child511, paise: 30_000 });
  [{ id: lunchSlotId }] = await db
    .insert(offeringSlots)
    .values({ propertyId, offeringId: lunch.id, label: "12:30 to 3:30 pm", startsAt: "12:30", endsAt: "15:30", defaultCapacity: 10 })
    .returning({ id: offeringSlots.id });
});

afterAll(async () => {
  await drop?.();
});

const settle = async <T>(attempts: Promise<T>[]) => {
  const results = await Promise.allSettled(attempts);
  return {
    won: results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<T>[],
    lost: results.filter((r) => r.status === "rejected") as PromiseRejectedResult[],
  };
};

describe("holds", () => {
  it("gives the last room to exactly one of twenty guests who race for it", async () => {
    const { won, lost } = await settle(
      Array.from({ length: 20 }, () => holdStay(db, { propertyId, checkIn: "2027-01-07", checkOut: "2027-01-09", rooms: [{ roomTypeId: lastRoomId, party: couple }] })),
    );
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(19);
    for (const loss of lost) expect(loss.reason).toBeInstanceOf(SoldOutError);
    // Thursday 7 January 2027 is a weekday night, Friday the 8th a weekend night: ₹5,000 + ₹8,000.
    expect(won[0].value.quote.totalPaise).toBe(1_300_000);
  });

  it("gives two guests the two units, and tells the third it is sold out", async () => {
    const stay = { propertyId, checkIn: "2027-02-01", checkOut: "2027-02-03", rooms: [{ roomTypeId: pairId, party: couple }] };
    const first = await holdStay(db, stay);
    const second = await holdStay(db, stay);
    const firstLine = first.quote.lines[0];
    const secondLine = second.quote.lines[0];
    expect(firstLine.kind === "stay" && secondLine.kind === "stay" && firstLine.unitId !== secondLine.unitId).toBe(true);
    await expect(holdStay(db, stay)).rejects.toBeInstanceOf(SoldOutError);
    // A stay that only touches the edge (check-out day = next check-in) is fine.
    await expect(holdStay(db, { ...stay, checkIn: "2027-02-03", checkOut: "2027-02-04" })).resolves.toBeDefined();
  });

  it("frees a room once its hold has run out", async () => {
    const stay = { propertyId, checkIn: "2027-03-01", checkOut: "2027-03-02", rooms: [{ roomTypeId: lastRoomId, party: couple }] };
    await holdStay(db, { ...stay, minutes: -1 });
    const search = await searchStays(db, propertyId, stay.checkIn, stay.checkOut);
    expect(search.find((option) => option.roomTypeId === lastRoomId)?.freeUnits).toBe(1);
    await expect(holdStay(db, stay)).resolves.toBeDefined();
  });

  it("checks guest limits and stay rules before taking anything", async () => {
    await expect(
      holdStay(db, { propertyId, checkIn: "2027-04-01", checkOut: "2027-04-02", rooms: [{ roomTypeId: pairId, party: { adults: 5, children: {} } }] }),
    ).rejects.toBeInstanceOf(RuleError);
    await db.insert(stayRules).values({ propertyId, roomTypeId: pairId, night: "2027-04-10", closedToArrival: true, minNights: 2 });
    await expect(
      holdStay(db, { propertyId, checkIn: "2027-04-10", checkOut: "2027-04-12", rooms: [{ roomTypeId: pairId, party: couple }] }),
    ).rejects.toThrow(/No arrivals/);
    const search = await searchStays(db, propertyId, "2027-04-10", "2027-04-11");
    expect(search.find((option) => option.roomTypeId === pairId)?.closedReason).toMatch(/No arrivals/);
  });
});

describe("seats", () => {
  it("sells exactly ten seats when fifteen guests race for a ten-seat lunch", async () => {
    const { won, lost } = await settle(
      Array.from({ length: 15 }, () => holdSeats(db, { propertyId, day: "2027-01-10", seats: [{ slotId: lunchSlotId, party: { adults: 1, children: {} } }] })),
    );
    expect(won).toHaveLength(10);
    for (const loss of lost) expect(loss.reason).toBeInstanceOf(SoldOutError);
    const [day] = await db.select().from(capacityDays).where(eq(capacityDays.slotId, lunchSlotId));
    expect(day).toMatchObject({ capacity: 10, held: 10, sold: 0 });
  });

  it("prices a family's lunch and refuses a party bigger than the seats left", async () => {
    const family = await holdSeats(db, { propertyId, day: "2027-01-17", seats: [{ slotId: lunchSlotId, party: { adults: 2, children: { child_5_11: 1, infant: 1 } } }] });
    expect(family.quote.totalPaise).toBe(150_000);
    await expect(
      holdSeats(db, { propertyId, day: "2027-01-17", seats: [{ slotId: lunchSlotId, party: { adults: 7, children: {} } }] }),
    ).rejects.toBeInstanceOf(SoldOutError);
  });
});

describe("blocks", () => {
  it("blocks a whole resort for a wedding, refuses holds, and frees it when lifted", async () => {
    const buyout = await createBlock(db, { propertyId, startsOn: "2027-05-01", endsOn: "2027-05-02", reason: "wedding_buyout" });
    expect(buyout.unitNights).toBe(6);
    await expect(
      holdStay(db, { propertyId, checkIn: "2027-05-02", checkOut: "2027-05-03", rooms: [{ roomTypeId: pairId, party: couple }] }),
    ).rejects.toBeInstanceOf(SoldOutError);
    await liftBlock(db, { blockId: buyout.blockId });
    await expect(
      holdStay(db, { propertyId, checkIn: "2027-05-02", checkOut: "2027-05-03", rooms: [{ roomTypeId: pairId, party: couple }] }),
    ).resolves.toBeDefined();
  });

  it("won't block a night that is already held", async () => {
    await holdStay(db, { propertyId, checkIn: "2027-06-01", checkOut: "2027-06-02", rooms: [{ roomTypeId: lastRoomId, party: couple }] });
    await expect(createBlock(db, { propertyId, roomTypeId: lastRoomId, startsOn: "2027-06-01", endsOn: "2027-06-01", reason: "maintenance" })).rejects.toThrow(
      /already held, booked or blocked/,
    );
  });
});

describe("bookings", () => {
  const guest = { name: "Asha Rao", phone: "98765 43210" };

  it("numbers bookings per resort and year", async () => {
    const one = await holdStay(db, { propertyId, checkIn: "2027-07-01", checkOut: "2027-07-02", rooms: [{ roomTypeId: pairId, party: couple }] });
    const two = await holdStay(db, { propertyId, checkIn: "2027-07-01", checkOut: "2027-07-02", rooms: [{ roomTypeId: pairId, party: couple }] });
    const first = await createBooking(db, { holdId: one.holdId, guest, source: "website", today: "2026-11-04" });
    const second = await createBooking(db, { holdId: two.holdId, guest, source: "phone", today: "2026-11-04" });
    expect(first.number).toBe("KS-26-000001");
    expect(second.number).toBe("KS-26-000002");
    // The same hold can't make a second booking.
    await expect(createBooking(db, { holdId: one.holdId, guest, source: "website" })).rejects.toBeInstanceOf(RuleError);
  });

  it("books the rooms on confirmation and gives them back on cancellation", async () => {
    const stay = { propertyId, checkIn: "2027-08-01", checkOut: "2027-08-03", rooms: [{ roomTypeId: lastRoomId, party: couple }] };
    const hold = await holdStay(db, stay);
    const { bookingId } = await createBooking(db, { holdId: hold.holdId, guest, source: "admin" });
    await confirmBooking(db, { bookingId });

    const rows = await db.select().from(unitNights).where(eq(unitNights.bookingId, bookingId));
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.holdId === null)).toBe(true);
    await expect(changeBookingStatus(db, { bookingId, to: "checked_out" })).rejects.toBeInstanceOf(TransitionError);

    await changeBookingStatus(db, { bookingId, to: "cancelled", note: "Plans changed" });
    expect(await db.select().from(unitNights).where(eq(unitNights.bookingId, bookingId))).toHaveLength(0);
    await expect(holdStay(db, stay)).resolves.toBeDefined();
    const timeline = await db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, bookingId)).orderBy(bookingEvents.id);
    expect(timeline.map((event) => event.toStatus)).toEqual(["pending_payment", "confirmed", "cancelled"]);
  });

  it("expires an unpaid booking with its hold, and frees the room", async () => {
    const stay = { propertyId, checkIn: "2027-09-01", checkOut: "2027-09-02", rooms: [{ roomTypeId: lastRoomId, party: couple }] };
    const hold = await holdStay(db, stay);
    const { bookingId } = await createBooking(db, { holdId: hold.holdId, guest, source: "website" });
    await db.update(holds).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(holds.id, hold.holdId));

    expect(await expireHolds(db)).toBeGreaterThanOrEqual(1);
    const [booking] = await db.select({ status: bookings.status }).from(bookings).where(eq(bookings.id, bookingId));
    expect(booking.status).toBe("expired");
    await expect(holdStay(db, stay)).resolves.toBeDefined();
  });

  it("sells seats on confirmation", async () => {
    const seats = await holdSeats(db, { propertyId, day: "2027-02-14", seats: [{ slotId: lunchSlotId, party: { adults: 2, children: {} } }] });
    const { bookingId } = await createBooking(db, { holdId: seats.holdId, guest, source: "walk_in", confirm: true });
    const [day] = await db.select().from(capacityDays).where(eq(capacityDays.day, "2027-02-14"));
    expect(day).toMatchObject({ sold: 2, held: 0 });
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    expect(booking).toMatchObject({ status: "confirmed", visitDate: "2027-02-14", totalPaise: 120_000 });
  });
});

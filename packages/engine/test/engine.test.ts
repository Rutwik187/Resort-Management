import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  ageBands,
  bookingEvents,
  bookingItems,
  bookings,
  capacityDays,
  holds,
  leadActivities,
  leads,
  offeringChildPrices,
  offlinePayments,
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
  addBookingNote,
  assignUnit,
  changeBookingStatus,
  confirmBooking,
  createBlock,
  createBooking,
  expireHolds,
  holdSeats,
  holdStay,
  liftBlock,
  quoteSeats,
  quoteStay,
  recordPayment,
  recordWebsiteLead,
  RuleError,
  searchStays,
  seatsLeft,
  setDayCapacity,
  setBookingPrice,
  SoldOutError,
  TransitionError,
  websiteCatalogue,
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

describe("payments and the front desk", () => {
  const guest = { name: "Kiran Patil", phone: "91234 56789" };
  const statusOf = async (bookingId: string) => (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0];

  it("keeps a part-paid booking's room after its hold runs out, and confirms it without booking twice", async () => {
    const stay = { propertyId, checkIn: "2027-10-04", checkOut: "2027-10-06", rooms: [{ roomTypeId: lastRoomId, party: couple }] };
    const hold = await holdStay(db, stay);
    const total = hold.quote.totalPaise!;
    const { bookingId } = await createBooking(db, { holdId: hold.holdId, guest, source: "phone" });

    await recordPayment(db, { bookingId, amountPaise: 100_000, method: "upi", reference: "UPI 4411" });
    expect(await statusOf(bookingId)).toMatchObject({ status: "part_paid", paidPaise: 100_000 });
    // The hold's time is up, but the advance booked the room: nobody else can hold it.
    await db.update(holds).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(holds.id, hold.holdId));
    await expireHolds(db);
    await expect(holdStay(db, stay)).rejects.toBeInstanceOf(SoldOutError);

    await recordPayment(db, { bookingId, amountPaise: total - 100_000, method: "cash" });
    expect(await statusOf(bookingId)).toMatchObject({ status: "confirmed", paidPaise: total });
    expect(await db.select().from(unitNights).where(eq(unitNights.bookingId, bookingId))).toHaveLength(2);
    expect(await db.select().from(offlinePayments).where(eq(offlinePayments.bookingId, bookingId))).toHaveLength(2);
  });

  it("sells a part-paid day booking's seats once", async () => {
    const seats = await holdSeats(db, { propertyId, day: "2027-03-14", seats: [{ slotId: lunchSlotId, party: { adults: 3, children: {} } }] });
    const { bookingId } = await createBooking(db, { holdId: seats.holdId, guest, source: "walk_in", payment: { amountPaise: 50_000, method: "cash" } });
    const day = async () => (await db.select().from(capacityDays).where(eq(capacityDays.day, "2027-03-14")))[0];
    expect(await day()).toMatchObject({ sold: 3, held: 0 });
    await recordPayment(db, { bookingId, amountPaise: 130_000, method: "card" });
    expect(await statusOf(bookingId)).toMatchObject({ status: "confirmed", paidPaise: 180_000 });
    expect(await day()).toMatchObject({ sold: 3, held: 0 });
  });

  it("refuses more than the balance, and money on a cancelled booking", async () => {
    const hold = await holdStay(db, { propertyId, checkIn: "2027-10-11", checkOut: "2027-10-12", rooms: [{ roomTypeId: pairId, party: couple }] });
    const { bookingId } = await createBooking(db, { holdId: hold.holdId, guest, source: "whatsapp" });
    await expect(recordPayment(db, { bookingId, amountPaise: hold.quote.totalPaise! + 1, method: "cash" })).rejects.toThrow(/more than the balance/);
    await expect(recordPayment(db, { bookingId, amountPaise: 0, method: "cash" })).rejects.toBeInstanceOf(RuleError);
    await changeBookingStatus(db, { bookingId, to: "cancelled" });
    await expect(recordPayment(db, { bookingId, amountPaise: 100, method: "cash" })).rejects.toThrow(/can't take a payment/);
  });

  it("books at a price staff set, with the reason, and takes the full payment at the desk", async () => {
    const hold = await holdStay(db, { propertyId, checkIn: "2027-10-18", checkOut: "2027-10-19", rooms: [{ roomTypeId: pairId, party: couple }] });
    await expect(
      createBooking(db, { holdId: hold.holdId, guest, source: "walk_in", priceOverride: { totalPaise: 400_000, reason: " " } }),
    ).rejects.toThrow(/Say why/);
    const { bookingId } = await createBooking(db, {
      holdId: hold.holdId,
      guest,
      source: "travel_agent",
      priceOverride: { totalPaise: 400_000, reason: "Agent rate agreed by the manager" },
      payment: { amountPaise: 400_000, method: "bank_transfer", reference: "NEFT 7781" },
    });
    expect(await statusOf(bookingId)).toMatchObject({ status: "confirmed", totalPaise: 400_000, paidPaise: 400_000, source: "travel_agent" });
    const timeline = await db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, bookingId)).orderBy(bookingEvents.id);
    expect(timeline.map((event) => event.type)).toEqual(["created", "price_override", "payment", "status"]);
    expect(timeline[1]).toMatchObject({ note: "Agent rate agreed by the manager", data: { fromPaise: hold.quote.totalPaise, toPaise: 400_000 } });
    // A later price can't fall below what was paid.
    await expect(setBookingPrice(db, { bookingId, totalPaise: 300_000, reason: "Discount" })).rejects.toThrow(/less than what the guest has paid/);
  });

  it("moves a stay to another free room of the same type, and refuses a taken one", async () => {
    const dates = { propertyId, checkIn: "2027-11-08", checkOut: "2027-11-10" };
    const first = await holdStay(db, { ...dates, rooms: [{ roomTypeId: pairId, party: couple }] });
    const second = await holdStay(db, { ...dates, rooms: [{ roomTypeId: pairId, party: couple }] });
    const a = await createBooking(db, { holdId: first.holdId, guest, source: "phone", confirm: true });
    const b = await createBooking(db, { holdId: second.holdId, guest, source: "phone", confirm: true });
    const [itemA] = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, a.bookingId));
    const [itemB] = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, b.bookingId));

    await expect(assignUnit(db, { bookingItemId: itemA.id, unitId: itemB.unitId! })).rejects.toBeInstanceOf(SoldOutError);
    await changeBookingStatus(db, { bookingId: b.bookingId, to: "cancelled" });
    await assignUnit(db, { bookingItemId: itemA.id, unitId: itemB.unitId! });

    const nights = await db.select().from(unitNights).where(eq(unitNights.bookingId, a.bookingId));
    expect(nights.map((n) => n.unitId)).toEqual([itemB.unitId, itemB.unitId]);
    // The old room is free again.
    await expect(holdStay(db, { ...dates, rooms: [{ roomTypeId: pairId, party: couple }] })).resolves.toMatchObject({ quote: { lines: [{ unitId: itemA.unitId }] } });
  });

  it("opens check-in on the day the guest is due, and keeps notes on the timeline", async () => {
    const hold = await holdStay(db, { propertyId, checkIn: "2027-12-01", checkOut: "2027-12-02", rooms: [{ roomTypeId: lastRoomId, party: couple }] });
    const { bookingId } = await createBooking(db, { holdId: hold.holdId, guest, source: "phone", confirm: true });
    await expect(changeBookingStatus(db, { bookingId, to: "checked_in", today: "2027-11-30" })).rejects.toThrow(/due on 2027-12-01/);
    await changeBookingStatus(db, { bookingId, to: "checked_in", today: "2027-12-01" });
    await addBookingNote(db, { bookingId, note: "  Late arrival, around 9 pm. " });
    await expect(addBookingNote(db, { bookingId, note: " " })).rejects.toBeInstanceOf(RuleError);
    const timeline = await db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, bookingId)).orderBy(bookingEvents.id);
    expect(timeline.at(-1)).toMatchObject({ type: "note", note: "Late arrival, around 9 pm." });
    expect((await statusOf(bookingId)).status).toBe("checked_in");
  });
});

describe("quotes", () => {
  it("prices a stay exactly as a hold would, and keeps nothing", async () => {
    const stay = { propertyId, checkIn: "2027-12-06", checkOut: "2027-12-08", rooms: [{ roomTypeId: lastRoomId, party: { adults: 3, children: { child_5_11: 1 } } }] };
    const quote = await quoteStay(db, stay);
    expect(quote.lines).toHaveLength(1);
    expect(await db.select().from(unitNights).where(eq(unitNights.night, "2027-12-06"))).toHaveLength(0);
    const hold = await holdStay(db, stay);
    expect(hold.quote.totalPaise).toBe(quote.totalPaise);
    // With the only unit held, the quote says sold out, as a hold would.
    await expect(quoteStay(db, stay)).rejects.toBeInstanceOf(SoldOutError);
  });

  it("counts a day's seats left, without holds that have run out", async () => {
    const day = "2027-12-12";
    const quote = await quoteSeats(db, { propertyId, day, seats: [{ slotId: lunchSlotId, party: couple }] });
    expect(quote.totalPaise).toBe(120_000);
    expect((await seatsLeft(db, propertyId, day)).find((s) => s.slotId === lunchSlotId)).toMatchObject({ capacity: 10, sold: 0, held: 0, left: 10 });

    const live = await holdSeats(db, { propertyId, day, seats: [{ slotId: lunchSlotId, party: { adults: 4, children: {} } }] });
    const gone = await holdSeats(db, { propertyId, day, seats: [{ slotId: lunchSlotId, party: { adults: 3, children: {} } }] });
    await db.update(holds).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(holds.id, gone.holdId));
    expect((await seatsLeft(db, propertyId, day)).find((s) => s.slotId === lunchSlotId)).toMatchObject({ held: 4, left: 6 });
    expect(live.holdId).toBeDefined();
  });
});

describe("leaving early and no-shows", () => {
  const guest = { name: "Meera Joshi", phone: "90000 11111" };

  it("frees the nights ahead when a guest leaves early, and keeps the nights stayed", async () => {
    const stay = { propertyId, checkIn: "2027-12-20", checkOut: "2027-12-23", rooms: [{ roomTypeId: lastRoomId, party: couple }] };
    const hold = await holdStay(db, stay);
    const { bookingId } = await createBooking(db, { holdId: hold.holdId, guest, source: "phone", confirm: true });
    await changeBookingStatus(db, { bookingId, to: "checked_in", today: "2027-12-20" });
    await changeBookingStatus(db, { bookingId, to: "checked_out", today: "2027-12-21" });
    const kept = await db.select().from(unitNights).where(eq(unitNights.bookingId, bookingId));
    expect(kept.map((n) => n.night)).toEqual(["2027-12-20"]);
    await expect(holdStay(db, { ...stay, checkIn: "2027-12-21" })).resolves.toBeDefined();
  });

  it("frees the room and the seats when a guest doesn't come", async () => {
    const hold = await holdStay(db, { propertyId, checkIn: "2027-12-27", checkOut: "2027-12-29", rooms: [{ roomTypeId: lastRoomId, party: couple }] });
    const { bookingId } = await createBooking(db, { holdId: hold.holdId, guest, source: "phone", confirm: true });
    await changeBookingStatus(db, { bookingId, to: "no_show", today: "2027-12-27" });
    expect(await db.select().from(unitNights).where(eq(unitNights.bookingId, bookingId))).toHaveLength(0);

    const seats = await holdSeats(db, { propertyId, day: "2027-12-26", seats: [{ slotId: lunchSlotId, party: { adults: 5, children: {} } }] });
    const day = await createBooking(db, { holdId: seats.holdId, guest, source: "walk_in", confirm: true });
    await changeBookingStatus(db, { bookingId: day.bookingId, to: "no_show", today: "2027-12-26" });
    const [row] = await db.select().from(capacityDays).where(eq(capacityDays.day, "2027-12-26"));
    expect(row).toMatchObject({ sold: 0, held: 0 });
  });
});

describe("day capacity", () => {
  it("sets a day's seats, and never below the guests already sold", async () => {
    const day = "2028-01-09";
    await setDayCapacity(db, { slotId: lunchSlotId, days: [day, "2028-01-10"], capacity: 3 });
    expect((await seatsLeft(db, propertyId, day)).find((s) => s.slotId === lunchSlotId)).toMatchObject({ capacity: 3, left: 3 });
    await expect(holdSeats(db, { propertyId, day, seats: [{ slotId: lunchSlotId, party: { adults: 4, children: {} } }] })).rejects.toBeInstanceOf(SoldOutError);

    const seats = await holdSeats(db, { propertyId, day, seats: [{ slotId: lunchSlotId, party: { adults: 3, children: {} } }] });
    await createBooking(db, { holdId: seats.holdId, guest: { name: "Ravi" }, source: "phone", confirm: true });
    const result = await setDayCapacity(db, { slotId: lunchSlotId, days: [day, "2028-01-10"], capacity: 2 });
    expect(result).toEqual({ changed: 1, kept: [day] });
    expect((await seatsLeft(db, propertyId, "2028-01-10")).find((s) => s.slotId === lunchSlotId)).toMatchObject({ capacity: 2 });
    await expect(setDayCapacity(db, { slotId: lunchSlotId, days: [day], capacity: -1 })).rejects.toBeInstanceOf(RuleError);
  });
});

describe("the website", () => {
  it("takes any party for a room type that publishes no guest limit", async () => {
    const [villa] = await db
      .insert(roomTypes)
      .values({ propertyId, code: "open-villa", name: "Open villa", category: "villa", baseOccupancy: 1, maxAdults: null, maxGuests: null, sortOrder: 3 })
      .returning();
    await db.insert(units).values({ propertyId, roomTypeId: villa.id, name: "Open villa" });
    await db.insert(rates).values({ propertyId, roomTypeId: villa.id, dayKind: "any", basis: "person", basePaise: 250_000 });
    const hold = await holdStay(db, { propertyId, checkIn: "2028-02-01", checkOut: "2028-02-02", rooms: [{ roomTypeId: villa.id, party: { adults: 25, children: {} } }] });
    // Priced per adult: 25 × ₹2,500.
    expect(hold.quote.totalPaise).toBe(6_250_000);
  });

  it("lists what is on sale and on the website, with base rates and child prices by band code", async () => {
    const [hidden] = await db
      .insert(roomTypes)
      .values({ propertyId, code: "staff-room", name: "Staff room", maxAdults: 2, maxGuests: 2, onWebsite: false, sortOrder: 9 })
      .returning();
    const catalogue = await websiteCatalogue(db, "KS");
    expect(catalogue?.roomTypes.map((t) => t.code)).not.toContain(hidden.code);
    const glass = catalogue!.roomTypes.find((t) => t.code === "glass-house")!;
    expect(glass).toMatchObject({ units: 1, maxGuests: 5 });
    expect(glass.rates.map((r) => r.dayKind).sort()).toEqual(["weekday", "weekend"]);
    expect(glass.rates[0].childPaise).toEqual({ child_5_11: 80_000 });
    const lunch = catalogue!.passes.find((p) => p.code === "sunday-lunch")!;
    expect(lunch).toMatchObject({ hours: "12:30 to 3:30 pm", adultPaise: 60_000, childPaise: { child_5_11: 30_000 } });
    expect(await websiteCatalogue(db, "XX")).toBeNull();
  });
});

describe("website leads", () => {
  it("saves a request as a lead, and a second request from the same phone joins it", async () => {
    const first = await recordWebsiteLead(db, { propertyCode: "KS", source: "website_booking", interest: "stay", name: "Meera", phone: "98765 00001", dateFrom: "2028-03-01", dateTo: "2028-03-03", request: { total: 10_000 } });
    const again = await recordWebsiteLead(db, { propertyCode: "KS", source: "website_enquiry", interest: "wedding", name: "Meera", phone: "+91 98765 00001", message: "And a wedding?" });
    expect(again).toEqual({ leadId: first.leadId, merged: true });
    const [lead] = await db.select().from(leads).where(eq(leads.id, first.leadId));
    expect(lead).toMatchObject({ phone: "919876500001", interest: "wedding", message: "And a wedding?", status: "new", source: "website_booking" });
    const timeline = await db.select().from(leadActivities).where(eq(leadActivities.leadId, first.leadId));
    expect(timeline.map((a) => a.type).sort()).toEqual(["created", "request"]);

    const other = await recordWebsiteLead(db, { propertyCode: "KS", source: "website_enquiry", interest: "day", name: "Arjun", phone: "98765 00002" });
    expect(other.merged).toBe(false);
    await expect(recordWebsiteLead(db, { propertyCode: "XX", source: "website_enquiry", interest: "day", name: "Arjun", phone: "98765 00002" })).rejects.toThrow();
  });
});

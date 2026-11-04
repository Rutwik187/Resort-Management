import { describe, expect, it } from "vitest";
import { priceNight, priceOffering, priceStay, type AgeBand, type RoomPricing } from "../src";

// The main site's bands and its Riverside Glass House rates, from apps/khed-shivapur/src/content/resort.ts.
const bands: AgeBand[] = [
  { id: "infant", code: "infant", free: true },
  { id: "small", code: "child_3_5", free: false },
  { id: "child", code: "child_5_11", free: false },
];

const glassHouse: RoomPricing = {
  baseOccupancy: 2,
  weekendNights: [5, 6],
  bands,
  baseRates: [
    { dayKind: "weekday", basis: "room", basePaise: 500_000, extraAdultPaise: 150_000, extraBedPaise: null, childPaise: { child: 80_000, small: 0 } },
    { dayKind: "weekend", basis: "room", basePaise: 800_000, extraAdultPaise: 200_000, extraBedPaise: null, childPaise: { child: 150_000, small: 80_000 } },
  ],
  seasons: [],
  dateRates: new Map(),
};

// 12 November 2026 is a Thursday; the 13th and 14th are Friday and Saturday.
const thursday = "2026-11-12";
const friday = "2026-11-13";
const couple = { adults: 2, children: {} };

describe("room prices", () => {
  it("charges the weekday rate on Thursday and the weekend rate on Friday", () => {
    expect(priceNight(glassHouse, thursday, couple).paise).toBe(500_000);
    expect(priceNight(glassHouse, friday, couple).paise).toBe(800_000);
    // The website showed the same stay as ₹13,000.
    expect(priceStay(glassHouse, [thursday, friday], couple).totalPaise).toBe(1_300_000);
  });

  it("adds the extra-adult price beyond the base occupancy", () => {
    expect(priceNight(glassHouse, thursday, { adults: 3, children: {} }).paise).toBe(650_000);
    expect(priceNight(glassHouse, friday, { adults: 4, children: {} }).paise).toBe(1_200_000);
  });

  it("charges children by age band, and babies nothing", () => {
    expect(priceNight(glassHouse, friday, { adults: 2, children: { child_5_11: 1, infant: 1 } }).paise).toBe(950_000);
    // A published price of zero is free, not unknown.
    expect(priceNight(glassHouse, thursday, { adults: 2, children: { child_3_5: 2 } }).paise).toBe(500_000);
  });

  it("never guesses a price the resort hasn't published", () => {
    const noSmallChildPrice: RoomPricing = { ...glassHouse, baseRates: [{ ...glassHouse.baseRates[0], childPaise: { child: 80_000 } }] };
    expect(priceNight(noSmallChildPrice, thursday, { adults: 2, children: { child_3_5: 1 } }).paise).toBeNull();
    const noExtraAdult: RoomPricing = { ...glassHouse, baseRates: [{ ...glassHouse.baseRates[0], extraAdultPaise: null }] };
    expect(priceNight(noExtraAdult, thursday, { adults: 3, children: {} }).paise).toBeNull();
    // No weekend rate at all: the weekend night, and so the stay, can't be priced.
    const weekdayOnly: RoomPricing = { ...glassHouse, baseRates: [glassHouse.baseRates[0]] };
    expect(priceStay(weekdayOnly, [thursday, friday], couple).totalPaise).toBeNull();
  });

  it("charges each adult on a per-person rate", () => {
    const bungalow: RoomPricing = {
      ...glassHouse,
      baseOccupancy: 1,
      baseRates: [{ dayKind: "weekday", basis: "person", basePaise: 200_000, extraAdultPaise: null, extraBedPaise: null, childPaise: { child: 100_000, small: 0 } }],
    };
    expect(priceNight(bungalow, thursday, { adults: 20, children: { child_5_11: 2 } }).paise).toBe(4_200_000);
  });

  it("lets a season beat the base rate, and a date price beat both", () => {
    const diwali = {
      id: "diwali",
      name: "Diwali",
      startsOn: "2026-11-10",
      endsOn: "2026-11-12",
      priority: 1,
      rates: [{ dayKind: "any" as const, basis: "room" as const, basePaise: 700_000, extraAdultPaise: 150_000, extraBedPaise: null, childPaise: { child: 80_000, small: 0 } }],
    };
    const withSeason: RoomPricing = { ...glassHouse, seasons: [diwali] };
    expect(priceNight(withSeason, thursday, couple)).toEqual({ night: thursday, source: "Diwali", paise: 700_000 });
    expect(priceNight(withSeason, friday, couple).source).toBe("base");

    const withDate: RoomPricing = { ...withSeason, dateRates: new Map([[thursday, 450_000]]) };
    // The date price replaces the base only; extra adults still pay the season's extra price.
    expect(priceNight(withDate, thursday, { adults: 3, children: {} })).toEqual({ night: thursday, source: "date", paise: 600_000 });
  });

  it("refuses extra beds without a published extra-bed price", () => {
    expect(priceNight(glassHouse, thursday, couple, 1).paise).toBeNull();
    const withBeds: RoomPricing = { ...glassHouse, baseRates: glassHouse.baseRates.map((r) => ({ ...r, extraBedPaise: 50_000 })) };
    expect(priceNight(withBeds, thursday, couple, 1).paise).toBe(550_000);
  });
});

describe("offering prices", () => {
  // The main site's morning day package: ₹1,500 an adult, ₹1,000 a child of 5 to 11, ₹500 a child of 3 to 5.
  const morning = { adultPaise: 150_000, childPaise: { child: 100_000, small: 50_000 } };

  it("charges each adult and each child by band", () => {
    // The website showed this party as ₹4,000.
    expect(priceOffering(morning, bands, { adults: 2, children: { child_5_11: 1 } })).toBe(400_000);
    expect(priceOffering(morning, bands, { adults: 1, children: { child_3_5: 1, infant: 1 } })).toBe(200_000);
  });

  it("returns null for a band with no price", () => {
    expect(priceOffering({ adultPaise: 150_000, childPaise: {} }, bands, { adults: 1, children: { child_5_11: 1 } })).toBeNull();
  });
});

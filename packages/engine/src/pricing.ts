import { dayOfWeek } from "./dates";

/*
 * Prices, as plain functions (docs/implementation-plan.md, section 5). All
 * money is whole paise. A price the resort hasn't published is never
 * guessed: it comes back as null, which the guest sees as "to confirm".
 * Offers, coupons, corporate rates and GST come in later steps.
 */

/** Who stays in one room or comes on one ticket: adults, and children by age band code. */
export type Party = { adults: number; children: Record<string, number> };

export type AgeBand = { id: string; code: string; free: boolean };

/** One price set: a room type's base rate or a season's rate, for weekday, weekend or any night. */
export type Rate = {
  dayKind: "weekday" | "weekend" | "any";
  basis: "room" | "person";
  basePaise: number;
  extraAdultPaise: number | null;
  extraBedPaise: number | null;
  /** By age band id. A band with children and no price makes the night unpriced. */
  childPaise: Record<string, number>;
};

export type Season = { id: string; name: string; startsOn: string; endsOn: string; priority: number; rates: Rate[] };

/** Everything needed to price one room type, loaded once per quote. */
export type RoomPricing = {
  baseOccupancy: number;
  /** Nights that take the weekend rate, by day of the week (PR-02). */
  weekendNights: readonly number[];
  bands: readonly AgeBand[];
  baseRates: readonly Rate[];
  seasons: readonly Season[];
  /** Night to base price, set from the inventory calendar (PR-04). */
  dateRates: ReadonlyMap<string, number>;
};

export type NightPrice = {
  night: string;
  /** Where the price came from: "date", a season's name, or "base". */
  source: string;
  paise: number | null;
};

export type StayPrice = { totalPaise: number | null; nights: NightPrice[] };

const pickRate = (list: readonly Rate[], weekend: boolean) =>
  list.find((rate) => rate.dayKind === (weekend ? "weekend" : "weekday")) ?? list.find((rate) => rate.dayKind === "any");

/** The rate for a night: the highest-priority season covering it, else the base rate (PR-03). */
function rateFor(pricing: RoomPricing, night: string): { rate: Rate | undefined; source: string } {
  const weekend = pricing.weekendNights.includes(dayOfWeek(night));
  const seasons = pricing.seasons
    .filter((season) => season.startsOn <= night && night <= season.endsOn)
    .sort((a, b) => b.priority - a.priority);
  for (const season of seasons) {
    const rate = pickRate(season.rates, weekend);
    if (rate) return { rate, source: season.name };
  }
  return { rate: pickRate(pricing.baseRates, weekend), source: "base" };
}

/** What the children in a party pay on one rate, or null when a band they're in has no price. */
function childrenPaise(rate: { childPaise: Record<string, number> }, bands: readonly AgeBand[], party: Party): number | null {
  let total = 0;
  for (const [code, count] of Object.entries(party.children)) {
    if (!count) continue;
    const band = bands.find((b) => b.code === code);
    if (!band) return null;
    if (band.free) continue;
    const each = rate.childPaise[band.id];
    if (each === undefined) return null;
    total += count * each;
  }
  return total;
}

/**
 * One night in one room for one party. A "room" rate covers the room's base
 * occupancy in adults; each further adult pays the extra-adult price. A
 * "person" rate is paid by each adult. Children pay their band's price;
 * free bands pay nothing. A date price replaces the base price only.
 */
export function priceNight(pricing: RoomPricing, night: string, party: Party, extraBeds = 0): NightPrice {
  const { rate, source } = rateFor(pricing, night);
  if (!rate) return { night, source, paise: null };
  const datePrice = pricing.dateRates.get(night);
  const base = datePrice ?? rate.basePaise;

  let paise: number;
  if (rate.basis === "person") {
    paise = base * party.adults;
  } else {
    const extraAdults = Math.max(0, party.adults - pricing.baseOccupancy);
    if (extraAdults > 0 && rate.extraAdultPaise === null) return { night, source, paise: null };
    paise = base + extraAdults * (rate.extraAdultPaise ?? 0);
  }

  const children = childrenPaise(rate, pricing.bands, party);
  if (children === null) return { night, source, paise: null };
  paise += children;

  if (extraBeds > 0) {
    if (rate.extraBedPaise === null) return { night, source, paise: null };
    paise += extraBeds * rate.extraBedPaise;
  }
  return { night, source: datePrice !== undefined ? "date" : source, paise };
}

/** Every night of a stay. The total is null if any night can't be priced. */
export function priceStay(pricing: RoomPricing, nights: readonly string[], party: Party, extraBeds = 0): StayPrice {
  const priced = nights.map((night) => priceNight(pricing, night, party, extraBeds));
  const totalPaise = priced.some((n) => n.paise === null) ? null : priced.reduce((sum, n) => sum + (n.paise ?? 0), 0);
  return { totalPaise, nights: priced };
}

/** An offering (day package, activity or restaurant seat) for one party: each adult, then children by band. */
export function priceOffering(offering: { adultPaise: number; childPaise: Record<string, number> }, bands: readonly AgeBand[], party: Party): number | null {
  const children = childrenPaise(offering, bands, party);
  return children === null ? null : party.adults * offering.adultPaise + children;
}

/** Everyone in a party, babies included. Day capacity counts heads. */
export const headcount = (party: Party) => party.adults + Object.values(party.children).reduce((sum, n) => sum + n, 0);

/** Guests who pay, for a room's minimum: adults and children in bands that aren't free. */
export function payingGuests(party: Party, bands: readonly AgeBand[]) {
  return party.adults + Object.entries(party.children).reduce((sum, [code, n]) => sum + (bands.find((b) => b.code === code)?.free ? 0 : n), 0);
}

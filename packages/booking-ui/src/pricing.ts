import { isWeekendNight, plural } from "./dates";
import type { Listing, Party, Pass, Rate } from "./types";

export const formatRupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export const emptyParty: Party = { adults: 0, children5to11: 0, children3to5: 0, under3: 0 };

/** Everyone in the party, babies included. */
export const headcount = (party: Party) => party.adults + party.children5to11 + party.children3to5 + party.under3;

/** Guests who pay: everyone aged 3 or more. */
export const payingGuests = (party: Party) => party.adults + party.children5to11 + party.children3to5;

/** "2 adults, 1 child aged 5 to 11" */
export function describeParty(party: Party) {
  const items = [
    party.adults && plural(party.adults, "adult"),
    party.children5to11 && `${plural(party.children5to11, "child", "children")} aged 5 to 11`,
    party.children3to5 && `${plural(party.children3to5, "child", "children")} aged 3 to 5`,
    party.under3 && `${plural(party.under3, "baby", "babies")} under 3`,
  ].filter(Boolean);
  return items.join(", ");
}

/** The rate for one night, or undefined when the listing publishes none for that night. */
export function rateForNight(listing: Listing, night: string): Rate | undefined {
  if (listing.everyNight) return listing.everyNight;
  return isWeekendNight(night) ? listing.weekend : listing.weekday;
}

/**
 * One night for one party. A couple rate covers two adults; each further
 * adult pays the extra-guest rate. A person rate is paid by each adult.
 * Children pay their age band's rate, and babies under 3 stay free.
 * Returns null when the party needs a rate that the resort doesn't publish,
 * so the price is left to the team rather than guessed.
 */
export function priceForNight(rate: Rate, party: Party): number | null {
  const charges: [count: number, each: number | undefined][] = [
    [party.children5to11, rate.child5to11],
    [party.children3to5, rate.child3to5],
  ];
  let total: number;
  if (rate.basis === "couple") {
    total = rate.base;
    charges.push([Math.max(0, party.adults - 2), rate.extraAdult]);
  } else {
    total = rate.base * party.adults;
  }
  for (const [count, each] of charges) {
    if (count === 0) continue;
    if (each === undefined) return null;
    total += count * each;
  }
  return total;
}

/** The whole stay for one party, each night at its own rate. Null if any night can't be priced. */
export function priceForStay(listing: Listing, party: Party, nights: string[]): number | null {
  if (listing.onRequest || nights.length === 0) return null;
  let total = 0;
  for (const night of nights) {
    const rate = rateForNight(listing, night);
    const price = rate ? priceForNight(rate, party) : null;
    if (price === null) return null;
    total += price;
  }
  return total;
}

/** One kind of day pass for one party. Babies under 3 come free. Null when a child's price isn't published. */
export function priceForPass(pass: Pass, party: Party): number | null {
  if ((party.children5to11 && pass.child5to11 === undefined) || (party.children3to5 && pass.child3to5 === undefined)) return null;
  return party.adults * pass.adult + party.children5to11 * (pass.child5to11 ?? 0) + party.children3to5 * (pass.child3to5 ?? 0);
}

/** The lowest published base rate, for "from ₹4,000 a night". */
export function lowestRate(listing: Listing) {
  const rates = [listing.weekday, listing.weekend, listing.everyNight].filter((rate): rate is Rate => Boolean(rate));
  return rates.length ? rates.reduce((low, rate) => (rate.base < low.base ? rate : low)) : null;
}

export const basisLabel = (rate: Rate) => (rate.basis === "couple" ? "per couple" : "per person");

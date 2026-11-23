/*
 * Offers and coupons (docs/implementation-plan.md, section 5, prices step 5;
 * OFR-02 to OFR-04): whether an offer covers a booking, and what it takes
 * off. One offer per booking. Pure functions, so the admin and the
 * websites' checkout apply the same rules. offer-choice.ts reads the
 * offers and their uses from the database and picks the best.
 */

import type { Quote } from "./holds";

export type OfferRule = {
  title: string;
  code: string | null;
  discountKind: "percent" | "amount" | "none";
  /** A percentage, or paise, by the kind. */
  discountValue: number | null;
  appliesTo: "stay" | "day" | "any";
  /** The nights or visit day it covers (the stay window). */
  startsOn: string | null;
  endsOn: string | null;
  minNights: number | null;
  active: boolean;
  /** When the booking must be made (the booking window). */
  bookFrom?: string | null;
  bookTo?: string | null;
  /** Early bird: at least this many days between booking and arrival. */
  minDaysAhead?: number | null;
  /** Last minute: at most this many days between booking and arrival. */
  maxDaysAhead?: number | null;
  /** Days of the week (0 Sunday) every night, or the visit day, must fall on. */
  weekdays?: number[] | null;
  /** Room types and packages it covers; empty covers all. */
  roomTypeIds?: string[];
  offeringIds?: string[];
  /** Long stay: free nights, such as 1 for "stay 3, pay 2". */
  freeNights?: number | null;
  /** The least the booking must cost before GST, in paise. */
  minAmountPaise?: number | null;
};

/** What a booking is, for the offer's rules. */
export type OfferTarget = {
  kind: "stay" | "day";
  from: string;
  to?: string;
  nights?: number;
  /** The day the booking is made, in India. Today when left out. */
  bookedOn?: string;
  /** What it books, for an offer limited to some rooms or packages. */
  roomTypeIds?: string[];
  offeringIds?: string[];
  /** Its price before GST, for a minimum amount. */
  subtotalPaise?: number | null;
};

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Why an offer doesn't cover a booking, in words, or null when it does. */
export function offerProblem(offer: OfferRule, target: OfferTarget): string | null {
  if (!offer.active) return `${offer.title} is off.`;
  if (offer.appliesTo !== "any" && offer.appliesTo !== target.kind) return `${offer.title} is for ${offer.appliesTo === "stay" ? "stays" : "day visits"} only.`;
  // A stay is covered when its nights fall within the offer's dates; a visit when its day does.
  const last = target.kind === "stay" && target.to ? addDay(target.to, -1) : target.from;
  if (offer.startsOn && target.from < offer.startsOn) return `${offer.title} starts on ${offer.startsOn}.`;
  if (offer.endsOn && last > offer.endsOn) return `${offer.title} ends on ${offer.endsOn}.`;
  if (target.kind === "stay" && offer.minNights && (target.nights ?? 0) < offer.minNights) return `${offer.title} needs at least ${offer.minNights} nights.`;

  const bookedOn = target.bookedOn ?? todayIndia();
  if (offer.bookFrom && bookedOn < offer.bookFrom) return `${offer.title} can be booked from ${offer.bookFrom}.`;
  if (offer.bookTo && bookedOn > offer.bookTo) return `${offer.title} could be booked until ${offer.bookTo}.`;
  const ahead = daysBetween(bookedOn, target.from);
  if (offer.minDaysAhead && ahead < offer.minDaysAhead) return `${offer.title} needs booking at least ${offer.minDaysAhead} days ahead.`;
  if (offer.maxDaysAhead !== null && offer.maxDaysAhead !== undefined && ahead > offer.maxDaysAhead) return `${offer.title} is for arrivals within ${offer.maxDaysAhead} days.`;

  if (offer.weekdays?.length) {
    const days = target.kind === "stay" && target.to ? nightsFrom(target.from, target.to) : [target.from];
    const off = days.find((day) => !offer.weekdays!.includes(weekdayOf(day)));
    if (off) return `${offer.title} covers ${offer.weekdays.map((d) => weekdayNames[d]).join(", ")} only.`;
  }
  if (offer.roomTypeIds?.length && target.kind === "stay" && target.roomTypeIds && !target.roomTypeIds.some((id) => offer.roomTypeIds!.includes(id))) {
    return `${offer.title} doesn't cover these rooms.`;
  }
  if (offer.offeringIds?.length && target.kind === "day" && target.offeringIds && !target.offeringIds.some((id) => offer.offeringIds!.includes(id))) {
    return `${offer.title} doesn't cover these packages.`;
  }
  if (offer.minAmountPaise && target.subtotalPaise !== undefined && (target.subtotalPaise ?? 0) < offer.minAmountPaise) {
    return `${offer.title} needs a booking of at least ₹${(offer.minAmountPaise / 100).toLocaleString("en-IN")} before GST.`;
  }
  return null;
}

/** What the offer takes off a price, never more than the price. An offer without a discount takes nothing. */
export function offerDiscount(offer: Pick<OfferRule, "discountKind" | "discountValue">, totalPaise: number): number {
  if (offer.discountKind === "percent" && offer.discountValue) return Math.min(totalPaise, Math.round((totalPaise * offer.discountValue) / 100));
  if (offer.discountKind === "amount" && offer.discountValue) return Math.min(totalPaise, offer.discountValue);
  return 0;
}

/**
 * What an offer takes off a quote before GST. It counts only the rooms and
 * packages it covers, never add-ons. Free nights take off the covered
 * rooms' price for that many nights, at their average rate, and always
 * leave one night to pay.
 */
export function quoteDiscount(offer: OfferRule, quote: Quote): number {
  const covered = quote.lines.filter((line) =>
    line.kind === "stay"
      ? !offer.roomTypeIds?.length || offer.roomTypeIds.includes(line.roomTypeId)
      : line.kind === "offering"
        ? !offer.offeringIds?.length || offer.offeringIds.includes(line.offeringId)
        : false,
  );
  if (covered.some((line) => line.totalPaise === null)) return 0;
  const base = covered.reduce((sum, line) => sum + (line.totalPaise ?? 0), 0);
  let off = offerDiscount(offer, base);
  if (offer.freeNights) {
    for (const line of covered) {
      if (line.kind !== "stay" || line.nights.length < 2) continue;
      const free = Math.min(offer.freeNights, line.nights.length - 1);
      off += Math.round(((line.totalPaise ?? 0) * free) / line.nights.length);
    }
  }
  return Math.min(base, off);
}

/** Whether an offer takes anything off by itself, so it can be applied without the team. */
export const offerTakesOff = (offer: Pick<OfferRule, "discountKind" | "freeNights">) => offer.discountKind !== "none" || Boolean(offer.freeNights);

/** Such as "10% off", "₹500 off", "Stay 3, pay 2" or "Applied by the team". */
export function offerLabel(offer: Pick<OfferRule, "discountKind" | "discountValue"> & { freeNights?: number | null; minNights?: number | null }): string {
  const parts: string[] = [];
  if (offer.discountKind === "percent") parts.push(`${offer.discountValue}% off`);
  if (offer.discountKind === "amount") parts.push(`₹${((offer.discountValue ?? 0) / 100).toLocaleString("en-IN")} off`);
  if (offer.freeNights) {
    const stay = Math.max(offer.minNights ?? offer.freeNights + 1, offer.freeNights + 1);
    parts.push(`Stay ${stay}, pay ${stay - offer.freeNights}`);
  }
  return parts.length ? parts.join(" and ") : "Applied by the team";
}

function addDay(date: string, days: number) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

function nightsFrom(from: string, to: string) {
  const nights: string[] = [];
  for (let night = from; night < to; night = addDay(night, 1)) nights.push(night);
  return nights;
}

const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const todayIndia = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

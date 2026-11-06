/*
 * Offers and coupons (docs/implementation-plan.md, section 5, prices step 5):
 * whether an offer covers a booking, and what it takes off. One offer per
 * booking. Pure functions, so the admin and, later, the websites' checkout
 * apply the same rules.
 */

export type OfferRule = {
  title: string;
  code: string | null;
  discountKind: "percent" | "amount" | "none";
  /** A percentage, or paise, by the kind. */
  discountValue: number | null;
  appliesTo: "stay" | "day" | "any";
  startsOn: string | null;
  endsOn: string | null;
  minNights: number | null;
  active: boolean;
};

/** What a booking is, for the offer's rules. */
export type OfferTarget = { kind: "stay" | "day"; from: string; to?: string; nights?: number };

/** Why an offer doesn't cover a booking, in words, or null when it does. */
export function offerProblem(offer: OfferRule, target: OfferTarget): string | null {
  if (!offer.active) return `${offer.title} is off.`;
  if (offer.appliesTo !== "any" && offer.appliesTo !== target.kind) return `${offer.title} is for ${offer.appliesTo === "stay" ? "stays" : "day visits"} only.`;
  // A stay is covered when its nights fall within the offer's dates; a visit when its day does.
  const last = target.kind === "stay" && target.to ? previousDay(target.to) : target.from;
  if (offer.startsOn && target.from < offer.startsOn) return `${offer.title} starts on ${offer.startsOn}.`;
  if (offer.endsOn && last > offer.endsOn) return `${offer.title} ends on ${offer.endsOn}.`;
  if (target.kind === "stay" && offer.minNights && (target.nights ?? 0) < offer.minNights) return `${offer.title} needs at least ${offer.minNights} nights.`;
  return null;
}

/** What the offer takes off a price, never more than the price. An offer without a discount takes nothing. */
export function offerDiscount(offer: Pick<OfferRule, "discountKind" | "discountValue">, totalPaise: number): number {
  if (offer.discountKind === "percent" && offer.discountValue) return Math.min(totalPaise, Math.round((totalPaise * offer.discountValue) / 100));
  if (offer.discountKind === "amount" && offer.discountValue) return Math.min(totalPaise, offer.discountValue);
  return 0;
}

/** Such as "10% off", "₹500 off" or "Applied by the team". */
export function offerLabel(offer: Pick<OfferRule, "discountKind" | "discountValue">): string {
  if (offer.discountKind === "percent") return `${offer.discountValue}% off`;
  if (offer.discountKind === "amount") return `₹${((offer.discountValue ?? 0) / 100).toLocaleString("en-IN")} off`;
  return "Applied by the team";
}

function previousDay(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { bookings, offerDays, offers, offerUses, type Executor } from "@repo/db";
import { todayInIndia } from "./dates";
import type { Quote } from "./holds";
import { offerProblem, offerTakesOff, quoteDiscount, type OfferRule, type OfferTarget } from "./offers";

/*
 * Choosing a booking's offer (OFR-01, OFR-03, OFR-04). The best automatic
 * offer applies: one without a code, or the Offer of the Day. A coupon
 * replaces it only when it gives the guest a better price. Use limits count
 * every booking that took the offer, except those that expired unpaid.
 */

type OfferRow = typeof offers.$inferSelect;

/** The offer a booking takes, and what it takes off before GST. */
export type AppliedOffer = { offerId: string; title: string; code: string | null; discountPaise: number; offerDay: string | null };

export const toRule = (row: OfferRow): OfferRule => ({
  title: row.title,
  code: row.code,
  discountKind: row.discountKind,
  discountValue: row.discountValue,
  appliesTo: row.appliesTo,
  startsOn: row.startsOn,
  endsOn: row.endsOn,
  minNights: row.minNights,
  active: row.active,
  bookFrom: row.bookFrom,
  bookTo: row.bookTo,
  minDaysAhead: row.minDaysAhead,
  maxDaysAhead: row.maxDaysAhead,
  weekdays: row.weekdays,
  roomTypeIds: row.roomTypeIds,
  offeringIds: row.offeringIds,
  freeNights: row.freeNights,
  minAmountPaise: row.minAmountPaise,
});

/** The target of a quote: what it books, when, and its price before GST. */
export function quoteTarget(quote: Quote, bookedOn: string): OfferTarget {
  const stay = quote.checkIn && quote.checkOut;
  return {
    kind: stay ? "stay" : "day",
    from: stay ? quote.checkIn! : quote.day!,
    to: stay ? quote.checkOut : undefined,
    nights: stay ? Math.round((Date.parse(`${quote.checkOut}T00:00:00Z`) - Date.parse(`${quote.checkIn}T00:00:00Z`)) / 86_400_000) : undefined,
    bookedOn,
    roomTypeIds: quote.lines.flatMap((line) => (line.kind === "stay" ? [line.roomTypeId] : [])),
    offeringIds: quote.lines.flatMap((line) => (line.kind === "offering" ? [line.offeringId] : [])),
    subtotalPaise: quote.subtotalPaise ?? null,
  };
}

const kept = ne(bookings.status, "expired");

/** Why an offer's use limits stop this booking, or null. */
export async function offerUsageProblem(db: Executor, offer: Pick<OfferRow, "id" | "title" | "maxUses" | "maxUsesPerGuest">, guestKey: string | null): Promise<string | null> {
  if (offer.maxUses) {
    const [{ n }] = await db.select({ n: count() }).from(offerUses).innerJoin(bookings, eq(bookings.id, offerUses.bookingId)).where(and(eq(offerUses.offerId, offer.id), kept));
    if (n >= offer.maxUses) return `${offer.title} has been used up.`;
  }
  if (offer.maxUsesPerGuest && guestKey) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(offerUses)
      .innerJoin(bookings, eq(bookings.id, offerUses.bookingId))
      .where(and(eq(offerUses.offerId, offer.id), eq(offerUses.guestKey, guestKey), kept));
    if (n >= offer.maxUsesPerGuest) return `You have already used ${offer.title}${offer.maxUsesPerGuest > 1 ? ` ${offer.maxUsesPerGuest} times` : ""}.`;
  }
  return null;
}

/** Today's Offer of the Day at a resort, with how many bookings may still take it. Null when there is none, or it is used up. */
export async function offerOfTheDay(db: Executor, propertyId: string, day = todayInIndia()) {
  const [row] = await db
    .select({ offer: offers, quantity: offerDays.quantity })
    .from(offerDays)
    .innerJoin(offers, eq(offers.id, offerDays.offerId))
    .where(and(eq(offerDays.propertyId, propertyId), eq(offerDays.day, day), eq(offers.active, true)));
  if (!row) return null;
  const [{ n }] = await db
    .select({ n: count() })
    .from(offerUses)
    .innerJoin(bookings, eq(bookings.id, offerUses.bookingId))
    .where(and(eq(offerUses.offerId, row.offer.id), eq(offerUses.offerDay, day), kept));
  const left = row.quantity === null ? null : Math.max(0, row.quantity - n);
  if (left === 0) return null;
  return { offer: row.offer, day, left };
}

/**
 * The best offer for a quote, and why the guest's coupon didn't apply, if
 * it didn't. On the website only offers shown there apply by themselves.
 */
export async function chooseOffer(
  db: Executor,
  input: { propertyId: string; quote: Quote; couponCode?: string | null; guestKey?: string | null; website: boolean; today?: string },
): Promise<{ applied: AppliedOffer | null; couponProblem: string | null; couponOutdone?: boolean }> {
  const today = input.today ?? todayInIndia();
  const target = quoteTarget(input.quote, today);
  if (input.quote.subtotalPaise === null || input.quote.subtotalPaise === undefined) {
    return { applied: null, couponProblem: input.couponCode ? "This booking has no price yet, so a coupon can't apply." : null };
  }
  const guestKey = input.guestKey ?? null;

  const rows = await db.select().from(offers).where(and(eq(offers.propertyId, input.propertyId), eq(offers.active, true))).orderBy(asc(offers.sortOrder));
  // An offer scheduled as Offer of the Day applies by itself only on its days.
  const scheduled = await db.select({ offerId: offerDays.offerId }).from(offerDays).where(eq(offerDays.propertyId, input.propertyId)).groupBy(offerDays.offerId);
  const scheduledIds = new Set(scheduled.map((s) => s.offerId));
  const daily = await offerOfTheDay(db, input.propertyId, today);

  const candidates: { row: OfferRow; offerDay: string | null }[] = [];
  for (const row of rows) {
    if (row.code || !offerTakesOff(row) || scheduledIds.has(row.id)) continue;
    if (input.website && !row.onWebsite) continue;
    candidates.push({ row, offerDay: null });
  }
  if (daily && offerTakesOff(daily.offer)) candidates.push({ row: daily.offer, offerDay: daily.day });

  let best: AppliedOffer | null = null;
  for (const { row, offerDay } of candidates) {
    if (offerProblem(toRule(row), target)) continue;
    if (await offerUsageProblem(db, row, guestKey)) continue;
    const discountPaise = quoteDiscount(toRule(row), input.quote);
    if (discountPaise > 0 && (!best || discountPaise > best.discountPaise)) best = { offerId: row.id, title: row.title, code: null, discountPaise, offerDay };
  }

  const code = input.couponCode?.trim().toUpperCase();
  if (!code) return { applied: best, couponProblem: null };
  const coupon = rows.find((row) => row.code === code);
  if (!coupon) return { applied: best, couponProblem: `${code} isn't a coupon here, or it has ended.` };
  const problem = offerProblem(toRule(coupon), target) ?? (await offerUsageProblem(db, coupon, guestKey));
  if (problem) return { applied: best, couponProblem: problem };
  const discountPaise = quoteDiscount(toRule(coupon), input.quote);
  if (discountPaise === 0) return { applied: best, couponProblem: `${code} takes nothing off this booking.` };
  if (best && best.discountPaise >= discountPaise) return { applied: best, couponProblem: `${best.title} already gives you a better price than ${code}, so it stays.`, couponOutdone: true };
  return { applied: { offerId: coupon.id, title: coupon.title, code, discountPaise, offerDay: null }, couponProblem: null };
}

/** Keeps a booking's offer: on the booking, and as a use for the limits and the report. Run inside the booking's transaction. */
export async function recordOfferUse(tx: Executor, input: { propertyId: string; bookingId: string; offer: AppliedOffer; guestKey: string | null }) {
  await tx.update(bookings).set({ offerId: input.offer.offerId, discountPaise: input.offer.discountPaise, couponCode: input.offer.code }).where(eq(bookings.id, input.bookingId));
  await tx.insert(offerUses).values({
    propertyId: input.propertyId,
    offerId: input.offer.offerId,
    bookingId: input.bookingId,
    guestKey: input.guestKey,
    code: input.offer.code,
    discountPaise: input.offer.discountPaise,
    offerDay: input.offer.offerDay,
  });
}

/** For the offers report: bookings and discount per offer in a period, by the day each booking was made (OFR-05). */
export async function offerUseTotals(db: Executor, propertyId: string, from: string, to: string) {
  return db
    .select({
      offerId: offers.id,
      title: offers.title,
      code: offers.code,
      bookings: sql<number>`count(${offerUses.id})::int`,
      discountPaise: sql<number>`coalesce(sum(${offerUses.discountPaise}), 0)`.mapWith(Number),
      revenuePaise: sql<number>`coalesce(sum(${bookings.totalPaise}), 0)`.mapWith(Number),
    })
    .from(offerUses)
    .innerJoin(offers, eq(offers.id, offerUses.offerId))
    .innerJoin(bookings, eq(bookings.id, offerUses.bookingId))
    .where(and(eq(offerUses.propertyId, propertyId), kept, sql`(${offerUses.createdAt} at time zone 'Asia/Kolkata')::date between ${from} and ${to}`))
    .groupBy(offers.id, offers.title, offers.code)
    .orderBy(sql`count(${offerUses.id}) desc`);
}

import { asc, eq } from "drizzle-orm";
import { cancellationRules, type Executor } from "@repo/db";

/*
 * What a cancelling guest gets back, from the resort's cancellation rules
 * (docs/implementation-plan.md, section 5: cancellations). The rules only
 * suggest: staff see the suggestion and decide the refund.
 */

export type CancellationRule = { appliesTo: "stay" | "day" | "any"; daysBefore: number; refundPercent: number };

export type RefundSuggestion = {
  /** Whole days from the cancellation to the arrival; below zero once the day has passed. */
  daysBefore: number;
  refundPercent: number;
  amountPaise: number;
  /** Such as "8 or more days before arrival: 100% back". */
  rule: string;
};

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * The refund the rules give for money paid, cancelled on `today`. Rules for
 * the booking's own kind (stay or day visit) come before rules for any. The
 * rule with the most days that the cancellation still meets applies. Null
 * when the resort has no rules.
 */
export function suggestRefund(
  rules: readonly CancellationRule[],
  booking: { checkIn: string | null; visitDate: string | null; paidPaise: number },
  today: string,
): RefundSuggestion | null {
  const kind = booking.checkIn ? "stay" : "day";
  const own = rules.filter((r) => r.appliesTo === kind);
  const usable = (own.length ? own : rules.filter((r) => r.appliesTo === "any")).slice().sort((a, b) => b.daysBefore - a.daysBefore);
  if (usable.length === 0) return null;
  const arrival = booking.checkIn ?? booking.visitDate ?? today;
  const days = daysBetween(today, arrival);
  const rule = usable.find((r) => days >= r.daysBefore) ?? usable[usable.length - 1];
  return {
    daysBefore: days,
    refundPercent: rule.refundPercent,
    amountPaise: Math.floor((booking.paidPaise * rule.refundPercent) / 100),
    rule: `${rule.daysBefore === 0 ? "Up to the day of arrival" : `${rule.daysBefore} or more days before arrival`}: ${rule.refundPercent}% back`,
  };
}

/** A resort's cancellation rules, most days first. */
export async function loadCancellationRules(db: Executor, propertyId: string): Promise<CancellationRule[]> {
  return db
    .select({ appliesTo: cancellationRules.appliesTo, daysBefore: cancellationRules.daysBefore, refundPercent: cancellationRules.refundPercent })
    .from(cancellationRules)
    .where(eq(cancellationRules.propertyId, propertyId))
    .orderBy(asc(cancellationRules.appliesTo), asc(cancellationRules.daysBefore));
}

import { and, asc, eq, inArray } from "drizzle-orm";
import { addons, type Executor } from "@repo/db";
import { NotFoundError, RuleError } from "./errors";

/*
 * Add-ons (PR-06): meals, a barbecue, decoration, activity tickets and the
 * like, added to a stay or a day visit. Each one chosen becomes its own
 * line in the quote, priced from the database and taxed by the resort's
 * add-on GST rule. They have no stock: the team prepares them.
 */

export type AddonBasis = "unit" | "person" | "night";
export type AddonRequest = { addonId: string; quantity: number };

export type AddonQuoteLine = {
  kind: "addon";
  addonId: string;
  addonName: string;
  basis: AddonBasis;
  /** The stay's check-in or the visit's day: the date its GST is worked out for. */
  date: string;
  /** Units, people or rooms. */
  quantity: number;
  /** The stay's nights for a per-night add-on, otherwise 1. */
  nights: number;
  /** The price before GST for one unit, person or night. */
  unitPaise: number;
  totalPaise: number;
};

export const addonTotal = (unitPaise: number, quantity: number, basis: AddonBasis, nights: number) => unitPaise * quantity * (basis === "night" ? nights : 1);

/** Such as "2 people" or "1 room × 3 nights". */
export function addonQuantityWords(line: Pick<AddonQuoteLine, "basis" | "quantity" | "nights">) {
  const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
  if (line.basis === "person") return n(line.quantity, "person", "people");
  if (line.basis === "night") return `${n(line.quantity, "unit")} × ${n(line.nights, "night")}`;
  return n(line.quantity, "unit");
}

/**
 * Prices the add-ons a guest chose for a stay or a day. Throws RuleError for
 * an add-on that isn't sold with this kind of booking, or a quantity over
 * its limit. On the website, only add-ons shown there can be chosen.
 */
export async function priceAddons(
  db: Executor,
  propertyId: string,
  requests: readonly AddonRequest[],
  target: { kind: "stay" | "day"; date: string; nights: number },
  options: { website?: boolean } = {},
): Promise<AddonQuoteLine[]> {
  if (requests.length === 0) return [];
  // The same add-on twice is one line.
  const wanted = new Map<string, number>();
  for (const request of requests) wanted.set(request.addonId, (wanted.get(request.addonId) ?? 0) + request.quantity);
  const rows = await db
    .select()
    .from(addons)
    .where(and(eq(addons.propertyId, propertyId), inArray(addons.id, [...wanted.keys()])))
    .orderBy(asc(addons.sortOrder), asc(addons.name));
  if (rows.length !== wanted.size) throw new NotFoundError("Add-on");

  return rows.map((addon) => {
    const quantity = wanted.get(addon.id)!;
    if (!addon.active || (options.website && !addon.onWebsite)) throw new RuleError(`${addon.name} is not on sale.`);
    if (addon.soldWith !== "both" && addon.soldWith !== target.kind) throw new RuleError(`${addon.name} is only for ${addon.soldWith === "stay" ? "stays" : "day visits"}.`);
    if (!Number.isInteger(quantity) || quantity < 1) throw new RuleError(`Choose how many of ${addon.name}.`);
    if (quantity > addon.maxQuantity) throw new RuleError(`${addon.name}: at most ${addon.maxQuantity} for one booking.`);
    const nights = addon.basis === "night" ? target.nights : 1;
    return {
      kind: "addon",
      addonId: addon.id,
      addonName: addon.name,
      basis: addon.basis,
      date: target.date,
      quantity,
      nights,
      unitPaise: addon.pricePaise,
      totalPaise: addonTotal(addon.pricePaise, quantity, addon.basis, nights),
    };
  });
}

/**
 * A booking's add-ons after its dates change: the same add-ons at the
 * price the guest agreed, with per-night ones over the new nights.
 */
export function carryAddons(lines: readonly { kind: string }[], checkIn: string, nights: number): AddonQuoteLine[] {
  return lines
    .filter((line): line is AddonQuoteLine => line.kind === "addon")
    .map((line) => {
      const own = line.basis === "night" ? nights : 1;
      return { ...line, date: checkIn, nights: own, totalPaise: addonTotal(line.unitPaise, line.quantity, line.basis, own) };
    });
}

/** The add-ons a resort sells with stays or day visits, for staff choosing them. */
export async function addonsFor(db: Executor, propertyId: string, kind: "stay" | "day", options: { website?: boolean } = {}) {
  const rows = await db
    .select()
    .from(addons)
    .where(and(eq(addons.propertyId, propertyId), eq(addons.active, true), inArray(addons.soldWith, [kind, "both"]), options.website ? eq(addons.onWebsite, true) : undefined))
    .orderBy(asc(addons.sortOrder), asc(addons.name));
  return rows.map((a) => ({ id: a.id, code: a.code, name: a.name, summary: a.summary, basis: a.basis, pricePaise: a.pricePaise, maxQuantity: a.maxQuantity }));
}

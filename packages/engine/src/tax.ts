import { asc, eq } from "drizzle-orm";
import { taxRules, type Executor } from "@repo/db";

/*
 * GST (docs/implementation-plan.md, section 5, prices step 7). Rates are
 * rows in tax_rules, so a change in GST is a change in data. Rooms are taxed
 * by the price of each room for each night, so one stay can mix rates. The
 * price is taxed after any offer or price set by staff, because GST is on
 * what the guest actually pays. A supply with no rule is never guessed: its
 * GST is unknown, and so is the total.
 */

export type TaxKind = "room" | "offering" | "addon";

export type TaxRule = {
  appliesTo: TaxKind;
  label: string;
  sac: string | null;
  minUnitPaise: number;
  maxUnitPaise: number | null;
  rateBps: number;
  startsOn: string;
};

/** One thing to tax: a room for a night, a line of seats, or an add-on. */
export type TaxableItem = {
  kind: TaxKind;
  /** The night, or the day of the visit, which picks the rule in force. */
  date: string;
  /** The value of one unit for one day, which picks the band: a room's price for the night, or one guest's seat. */
  unitPaise: number;
  /** How many units the amount covers, so a discount scales the unit too. */
  units: number;
  amountPaise: number;
  /** Which quote line it came from, for invoices. */
  line: number;
};

/** The GST at one rate. */
export type TaxPart = { rateBps: number; sac: string | null; label: string; taxablePaise: number; taxPaise: number };

export type TaxedPrice = {
  /** Before GST. */
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  parts: TaxPart[];
  /** Each item with its rule, for invoices. */
  items: (TaxableItem & { rateBps: number; sac: string | null })[];
};

/** The rule for one item: in its band, started by its date, the newest start winning. */
export function ruleFor(rules: readonly TaxRule[], item: Pick<TaxableItem, "kind" | "date" | "unitPaise">): TaxRule | undefined {
  return rules
    .filter((r) => r.appliesTo === item.kind && r.startsOn <= item.date && item.unitPaise >= r.minUnitPaise && (r.maxUnitPaise === null || item.unitPaise <= r.maxUnitPaise))
    .sort((a, b) => (a.startsOn < b.startsOn ? 1 : a.startsOn > b.startsOn ? -1 : 0))[0];
}

/**
 * Spreads a new price over the items in proportion to their amounts, so an
 * offer or a price set by hand lowers every night alike. The amounts add up
 * to the price exactly: what rounding leaves goes to the largest item.
 * Items with no amount share the price equally.
 */
export function spread(items: readonly TaxableItem[], subtotalPaise: number): TaxableItem[] {
  if (items.length === 0) return [];
  const weights = items.map((item) => item.amountPaise);
  const whole = weights.reduce((sum, w) => sum + w, 0);
  const share = whole > 0 ? weights.map((w) => w / whole) : items.map(() => 1 / items.length);
  const amounts = share.map((s) => Math.floor(subtotalPaise * s));
  let left = subtotalPaise - amounts.reduce((sum, a) => sum + a, 0);
  const order = amounts.map((_, i) => i).sort((a, b) => share[b] - share[a]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) amounts[order[k]] += 1;
  return items.map((item, i) => ({ ...item, amountPaise: amounts[i], unitPaise: Math.round(amounts[i] / Math.max(1, item.units)) }));
}

/** GST on some items, grouped by rate. Null when an item has no rule. */
export function taxItems(items: readonly TaxableItem[], rules: readonly TaxRule[]): TaxedPrice | null {
  const ruled: TaxedPrice["items"] = [];
  const parts = new Map<string, TaxPart>();
  for (const item of items) {
    const rule = ruleFor(rules, item);
    if (!rule) return null;
    ruled.push({ ...item, rateBps: rule.rateBps, sac: rule.sac });
    const key = `${rule.rateBps}|${rule.sac ?? ""}`;
    const part = parts.get(key) ?? { rateBps: rule.rateBps, sac: rule.sac, label: rule.label, taxablePaise: 0, taxPaise: 0 };
    part.taxablePaise += item.amountPaise;
    parts.set(key, part);
  }
  const list = [...parts.values()].sort((a, b) => a.rateBps - b.rateBps);
  for (const part of list) part.taxPaise = Math.round((part.taxablePaise * part.rateBps) / 10_000);
  const subtotalPaise = ruled.reduce((sum, item) => sum + item.amountPaise, 0);
  const taxPaise = list.reduce((sum, part) => sum + part.taxPaise, 0);
  return { subtotalPaise, taxPaise, totalPaise: subtotalPaise + taxPaise, parts: list, items: ruled };
}

/** The parts of a quote that GST needs. Stay lines carry their nights; seat lines their day. */
export type TaxableQuote = {
  lines: (
    | { kind: "stay"; nights: { night: string; paise: number | null }[]; totalPaise: number | null }
    | { kind: "offering"; day: string; party: { adults: number; children: Record<string, number> }; totalPaise: number | null }
    | { kind: "addon"; date: string; quantity: number; totalPaise: number | null }
  )[];
};

/**
 * A quote's items to tax. A night or line with no price still counts, with
 * no amount, so a price set by hand can be spread over it.
 */
export function taxableItems(quote: TaxableQuote): TaxableItem[] {
  return quote.lines.flatMap((line, i): TaxableItem[] => {
    if (line.kind === "stay") return line.nights.map((night) => ({ kind: "room", date: night.night, unitPaise: night.paise ?? 0, units: 1, amountPaise: night.paise ?? 0, line: i }));
    if (line.kind === "offering") {
      const guests = Math.max(1, line.party.adults + Object.values(line.party.children).reduce((sum, n) => sum + n, 0));
      return [{ kind: "offering", date: line.day, unitPaise: Math.round((line.totalPaise ?? 0) / guests), units: guests, amountPaise: line.totalPaise ?? 0, line: i }];
    }
    return [{ kind: "addon", date: line.date, unitPaise: Math.round((line.totalPaise ?? 0) / Math.max(1, line.quantity)), units: Math.max(1, line.quantity), amountPaise: line.totalPaise ?? 0, line: i }];
  });
}

/**
 * GST on a quote. With no price given, on the quote's own prices; null when
 * a line has no price yet. With a price before GST (after an offer, or set
 * by staff), that price is spread over the lines first.
 */
export function taxQuote(quote: TaxableQuote, rules: readonly TaxRule[], subtotalPaise?: number | null): TaxedPrice | null {
  const items = taxableItems(quote);
  if (subtotalPaise === undefined || subtotalPaise === null) {
    if (quote.lines.some((line) => line.totalPaise === null)) return null;
    return taxItems(items, rules);
  }
  return taxItems(spread(items, subtotalPaise), rules);
}

/** A resort's GST rules. */
export async function loadTaxRules(db: Executor, propertyId: string): Promise<TaxRule[]> {
  return db
    .select({
      appliesTo: taxRules.appliesTo,
      label: taxRules.label,
      sac: taxRules.sac,
      minUnitPaise: taxRules.minUnitPaise,
      maxUnitPaise: taxRules.maxUnitPaise,
      rateBps: taxRules.rateBps,
      startsOn: taxRules.startsOn,
    })
    .from(taxRules)
    .where(eq(taxRules.propertyId, propertyId))
    .orderBy(asc(taxRules.appliesTo), asc(taxRules.minUnitPaise));
}

/** Such as "5%" or "18%". */
export const rateLabel = (bps: number) => `${(bps / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;

/** Splits GST into its central and state halves; any odd paisa goes to the state. */
export function splitGst(taxPaise: number) {
  const cgst = Math.floor(taxPaise / 2);
  return { cgstPaise: cgst, sgstPaise: taxPaise - cgst };
}

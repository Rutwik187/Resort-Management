/*
 * Starting money rules for a new resort, the same as migration 0008 gives
 * the resorts that existed then. The client's chartered accountant confirms
 * the GST rates; staff change both in the admin's Settings.
 */

type TaxRuleSeed = { appliesTo: "room" | "offering" | "addon"; label: string; sac: string | null; minUnitPaise: number; maxUnitPaise: number | null; rateBps: number; startsOn: string };

/** GST from 22 September 2025: rooms by their price per night, everything else at 18%. */
export const defaultTaxRules: TaxRuleSeed[] = [
  { appliesTo: "room", label: "Rooms up to ₹1,000 a night", sac: "996311", minUnitPaise: 0, maxUnitPaise: 100_000, rateBps: 0, startsOn: "2025-09-22" },
  { appliesTo: "room", label: "Rooms from ₹1,000 to ₹7,500 a night", sac: "996311", minUnitPaise: 100_001, maxUnitPaise: 750_000, rateBps: 500, startsOn: "2025-09-22" },
  { appliesTo: "room", label: "Rooms above ₹7,500 a night", sac: "996311", minUnitPaise: 750_001, maxUnitPaise: null, rateBps: 1800, startsOn: "2025-09-22" },
  { appliesTo: "offering", label: "Day packages, activities and meals", sac: "999633", minUnitPaise: 0, maxUnitPaise: null, rateBps: 1800, startsOn: "2025-09-22" },
  { appliesTo: "addon", label: "Add-ons", sac: null, minUnitPaise: 0, maxUnitPaise: null, rateBps: 1800, startsOn: "2025-09-22" },
];

/** The cancellation rules each resort's website published in November 2026. Valley published none. */
export const defaultCancellationRules: Record<string, { daysBefore: number; refundPercent: number }[]> = {
  KS: [{ daysBefore: 0, refundPercent: 0 }],
  GC: [{ daysBefore: 0, refundPercent: 0 }],
  SB: [
    { daysBefore: 8, refundPercent: 100 },
    { daysBefore: 3, refundPercent: 50 },
    { daysBefore: 0, refundPercent: 0 },
  ],
};

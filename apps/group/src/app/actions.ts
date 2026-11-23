"use server";

import { saveCorporateEnquiry, saveEnquiry } from "@repo/website/leads";

/*
 * Enquiries from the group site, kept as leads at the resort the guest
 * chose. A wedding or event enquiry goes to that resort's team.
 */

const codes = ["KS", "GC", "SB", "PV"] as const;

/** A wedding or event enquiry, for the resort the guest picked. */
export async function sendGroupEnquiry(property: string, enquiry: unknown): Promise<{ ok: boolean }> {
  const code = codes.find((c) => c === property);
  if (!code) return { ok: false };
  await saveEnquiry(code, enquiry);
  return { ok: true };
}

/** A corporate enquiry from the group site (CRP-02). */
export async function sendGroupCorporate(enquiry: unknown) {
  return saveCorporateEnquiry("GROUP", enquiry);
}

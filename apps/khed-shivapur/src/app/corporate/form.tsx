"use client";

import { CorporateEnquiryForm } from "@repo/booking-ui/corporate-form";
import { sendCorporateEnquiry } from "@/app/actions";

/** The shared corporate enquiry, sent through this site's server action. */
export function CorporateForm({ resorts, whatsapp }: { resorts: { code: string; name: string }[]; whatsapp: { number: string; display: string } }) {
  return <CorporateEnquiryForm resorts={resorts} whatsapp={whatsapp} policyHref="/policies" onSend={sendCorporateEnquiry} />;
}

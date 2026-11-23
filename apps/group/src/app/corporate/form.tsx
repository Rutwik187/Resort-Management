"use client";

import { CorporateEnquiryForm } from "@repo/booking-ui/corporate-form";
import { sendGroupCorporate } from "@/app/actions";

/** The shared corporate enquiry, from the group site. */
export function CorporateForm({ resorts }: { resorts: { code: string; name: string }[] }) {
  return <CorporateEnquiryForm resorts={resorts} whatsapp={{ number: "917721965656", display: "+91 77219 65656" }} policyHref="/policies" onSend={sendGroupCorporate} />;
}

"use server";

import { saveBookingRequest, saveEnquiry } from "@repo/website/leads";

/*
 * Requests from this site, kept as leads in the admin besides the WhatsApp
 * message the guest sends. Neither ever fails for the guest.
 */

/** A booking request from the Stays or Day packages page. */
export async function sendBookingRequest(request: unknown) {
  await saveBookingRequest("KS", request);
}

/** A message from the enquiry form. */
export async function sendEnquiry(enquiry: unknown) {
  await saveEnquiry("KS", enquiry);
}

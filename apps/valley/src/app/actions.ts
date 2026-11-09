"use server";

import type { LiveQuery, OnlineChoice, OnlineGuest, PaymentAnswer } from "@repo/booking-ui";
import { confirmOnlinePayment, liveStock, payGuestBalance, recheckGuestBooking, startOnlineBooking } from "@repo/website/booking";
import { saveBookingRequest, saveEnquiry } from "@repo/website/leads";

/*
 * Requests from this site, kept as leads in the admin besides the WhatsApp
 * message the guest sends. Neither ever fails for the guest.
 */

/** A booking request from the Stays or Day packages page. */
export async function sendBookingRequest(request: unknown) {
  await saveBookingRequest("PV", request);
}

/** A message from the enquiry form. */
export async function sendEnquiry(enquiry: unknown) {
  await saveEnquiry("PV", enquiry);
}

/** Holds and prices the guest's choice and opens the payment. */
export async function startBooking(choice: OnlineChoice, guest: OnlineGuest) {
  return startOnlineBooking("PV", choice, guest);
}

/** Checks the payment Razorpay's checkout reports. */
export async function confirmPayment(answer: PaymentAnswer) {
  return confirmOnlinePayment("PV", answer);
}

/** Opens a payment for what the guest still owes, from their booking page. */
export async function payBalance(token: string) {
  return payGuestBalance("PV", token);
}

/** Asks Razorpay about a payment the booking page is waiting for. */
export async function checkBooking(token: string) {
  return recheckGuestBooking("PV", token);
}

/** Live free rooms or places left, so the lists show what is sold out. */
export async function checkStock(query: LiveQuery) {
  return liveStock("PV", query);
}

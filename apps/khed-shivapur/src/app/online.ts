import { onlineBookingOpen } from "@repo/website/booking";
import { confirmPayment, startBooking } from "./actions";

/** The planners' online booking, once this resort takes payments; until then, requests go on WhatsApp. */
export async function onlineBooking() {
  return (await onlineBookingOpen("KS")) ? { start: startBooking, confirm: confirmPayment, termsHref: "/policies" } : undefined;
}

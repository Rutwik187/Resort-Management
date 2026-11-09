import { liveAddons } from "@repo/website";
import { onlineBookingOpen } from "@repo/website/booking";
import { confirmPayment, startBooking } from "./actions";

/**
 * The planners' online booking, with the add-ons for stays or day visits,
 * once this resort takes payments; until then, requests go on WhatsApp.
 */
export async function onlineBooking(kind: "stay" | "day") {
  if (!(await onlineBookingOpen("PV"))) return undefined;
  return { start: startBooking, confirm: confirmPayment, termsHref: "/policies", addons: await liveAddons("PV", kind) };
}

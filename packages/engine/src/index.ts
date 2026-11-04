/*
 * The shared booking engine (docs/implementation-plan.md, section 5): live
 * availability, holds that make double booking impossible, prices, and the
 * booking lifecycle. The resort sites and the admin both use it.
 */
export { freeUnits, searchStays, stayRuleProblem, type StayOption } from "./availability";
export { createBlock, liftBlock, type BlockReason } from "./blocks";
export {
  allowedMoves,
  changeBookingStatus,
  confirmBooking,
  createBooking,
  nextBookingNumber,
  normalisePhone,
  type BookingSource,
  type BookingStatus,
  type GuestInput,
} from "./bookings";
export { loadBands, loadRoomPricing, type RoomTypeInfo } from "./catalogue";
export { addDays, dayOfWeek, isDate, nightsOf, todayInIndia } from "./dates";
export { NotFoundError, RuleError, SoldOutError, TransitionError } from "./errors";
export { holdSeats, holdStay, releaseHold, type HoldResult, type OfferingQuoteLine, type Quote, type SeatRequest, type StayQuoteLine, type StayRequest } from "./holds";
export { expireHolds } from "./jobs";
export { headcount, payingGuests, priceNight, priceOffering, priceStay, type AgeBand, type NightPrice, type Party, type Rate, type RoomPricing, type Season } from "./pricing";

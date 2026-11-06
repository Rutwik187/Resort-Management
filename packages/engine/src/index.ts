/*
 * The shared booking engine (docs/implementation-plan.md, section 5): live
 * availability, holds that make double booking impossible, prices, and the
 * booking lifecycle. The resort sites and the admin both use it.
 */
export { freeUnits, searchStays, seatsLeft, stayRuleProblem, type SeatOption, type StayOption } from "./availability";
export { createBlock, liftBlock, type BlockReason } from "./blocks";
export { setDayCapacity } from "./capacity";
export {
  addBookingNote,
  allowedMoves,
  assignUnit,
  changeBookingStatus,
  confirmBooking,
  createBooking,
  nextBookingNumber,
  normalisePhone,
  setBookingPrice,
  type BookingSource,
  type BookingStatus,
  type GuestInput,
  type PriceOverride,
} from "./bookings";
export { loadBands, loadRoomPricing, type RoomTypeInfo } from "./catalogue";
export { addDays, dayOfWeek, isDate, nightsOf, todayInIndia } from "./dates";
export { NotFoundError, RuleError, SoldOutError, TransitionError } from "./errors";
export {
  holdSeats,
  holdStay,
  quoteSeats,
  quoteStay,
  releaseHold,
  type HoldResult,
  type OfferingQuoteLine,
  type Quote,
  type SeatRequest,
  type SeatsInput,
  type StayInput,
  type StayQuoteLine,
  type StayRequest,
} from "./holds";
export { expireHolds } from "./jobs";
export { recordPayment, type PaymentInput, type PaymentMethod } from "./payments";
export { headcount, payingGuests, priceNight, priceOffering, priceStay, type AgeBand, type NightPrice, type Party, type Rate, type RoomPricing, type Season } from "./pricing";
export { websiteCatalogue, type WebsiteCatalogue, type WebsitePass, type WebsiteRate, type WebsiteRoomType } from "./website";

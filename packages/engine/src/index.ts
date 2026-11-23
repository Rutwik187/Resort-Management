/*
 * The shared booking engine (docs/implementation-plan.md, section 5): live
 * availability, holds that make double booking impossible, prices, and the
 * booking lifecycle. The resort sites and the admin both use it.
 */
export { addonQuantityWords, addonsFor, addonTotal, carryAddons, priceAddons, type AddonBasis, type AddonQuoteLine, type AddonRequest } from "./addons";
export { freeUnits, searchStays, seatsLeft, stayRuleProblem, type SeatOption, type StayOption } from "./availability";
export { createBlock, liftBlock, type BlockReason } from "./blocks";
export { setDayCapacity } from "./capacity";
export { closedDates } from "./closed-dates";
export { syncSettlements } from "./settlements";
export { pruneRequestLimits, takeRequest } from "./limits";
export { syncGoogleReviews } from "./reviews";
export { groupDaySearch, groupStaySearch, type GroupDayResult, type GroupStayResult } from "./group";
export { queueSalesSummaries } from "./summaries";
export { queueBookingCancelled, queueBookingChanged, queueGuestJourney, queueLowRoomsAlerts, queueNewBookingAlert } from "./booking-messages";
export { fill as fillTemplate, templateKinds, wording, type TemplateKind } from "./templates";
export { loadPackage, packageArrivals, packageCheckOut, packageProblem, packagesByIds, pricePackage, type StayPackage } from "./packages";
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
export { CouponError, NotFoundError, RuleError, SoldOutError, TransitionError } from "./errors";
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
export { websiteCatalogue, type WebsiteAddon, type WebsiteCatalogue, type WebsiteCompany, type WebsiteOffer, type WebsiteOfferDay, type WebsiteStayPackage, type WebsiteReviews, type WebsiteNotice, type WebsitePass, type WebsiteRate, type WebsiteRoomType } from "./website";
export { dueFollowUps, duplicateLeads, mergeLeads, nextAssignee, recordWebsiteLead, type LeadInterest, type WebsiteLeadInput } from "./leads";
export { queueFollowUpReminders, queueLeadAlerts } from "./lead-messages";
export { offerDiscount, offerLabel, offerProblem, offerTakesOff, quoteDiscount, type OfferRule, type OfferTarget } from "./offers";
export { chooseOffer, offerOfTheDay, offerUsageProblem, offerUseTotals, quoteTarget, recordOfferUse, toRule as offerRule, type AppliedOffer } from "./offer-choice";
export { changeStay, quoteChange, type StayChange } from "./changes";
export { priceFor, type BookingPrice } from "./bookings";
export { lineTitle, subtotalOf, withTax, type QuoteLine } from "./holds";
export { loadTaxRules, rateLabel, ruleFor, splitGst, spread, taxItems, taxQuote, type TaxedPrice, type TaxKind, type TaxPart, type TaxRule } from "./tax";
export { alignInvoiceToKept, creditInvoice, ensureInvoice, financialYear, openInvoice } from "./invoices";
export { loadCancellationRules, suggestRefund, type CancellationRule, type RefundSuggestion } from "./cancellation";
export { decryptSecret, encryptSecret, hashToken, maskKey, newToken, signatureMatches } from "./secrets";
export { RazorpayError, razorpay, razorpaySender, type Razorpay, type RazorpayKeys, type RazorpaySend } from "./razorpay";
export {
  applyOnlinePayment,
  completeCheckout,
  createPaymentLink,
  dropPaymentLink,
  handleRazorpayWebhook,
  onlinePaymentsOf,
  paymentAccount,
  razorpayFor,
  recheckOnlinePayments,
  savePaymentAccount,
  setRazorpayClient,
  startCheckout,
  type PaymentAccount,
} from "./online";
export { decideRefund, processRefund, refundablePayments, requestRefund, retryRefund, settleRefund, type RefundRequest } from "./refunds";
export {
  bookingForGuest,
  bookOnline,
  cancelByGuest,
  guestCancellation,
  invoiceForGuest,
  newManageLink,
  payBalanceOnline,
  takesOnlineBookings,
  termsVersion,
  websiteAvailability,
  type GuestBooking,
  type WebsiteBookingInput,
  type WebsiteBookingStarted,
} from "./website-booking";
export { cancelHeldMessages, holdConfirmationEmail, queueBookingLinkEmail, queueConfirmationEmail, queueRefundEmail, releaseHeldMessages, sendQueuedEmails } from "./messages";

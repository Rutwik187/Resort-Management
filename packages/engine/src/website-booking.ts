import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { bookingItems, bookings, guests, holds, invoices, offerings, offeringSlots, onlinePayments, properties, roomTypes, units, type ConsentJson, type Database } from "@repo/db";
import { searchStays, seatsLeft } from "./availability";
import { createBooking, normalisePhone, type GuestInput } from "./bookings";
import { isDate } from "./dates";
import { NotFoundError, RuleError } from "./errors";
import { holdSeats, holdStay, releaseHold, type Quote } from "./holds";
import { paymentAccount, startCheckout } from "./online";
import type { Party } from "./pricing";
import { hashToken, newToken } from "./secrets";

/*
 * Booking on a resort's website (docs/implementation-plan.md, section 10:
 * booking steps 4 to 8). The site sends what the guest chose, by the codes
 * its listings carry; the engine holds the rooms or seats, prices them from
 * the database, makes the booking and a Razorpay order for the amount due
 * now. The browser never sets a price.
 */

/** The terms version saved with each booking. Change it when the policies change. */
export const termsVersion = "2026-11";

/** Whether a resort takes bookings and payments on its website. */
export async function takesOnlineBookings(db: Database, propertyCode: string) {
  const [property] = await db.select({ id: properties.id, active: properties.active }).from(properties).where(eq(properties.code, propertyCode));
  if (!property?.active) return false;
  return (await paymentAccount(db, property.id)) !== null;
}

/** Live free rooms and seats for the widget: per room type code and per package code. */
export async function websiteAvailability(db: Database, input: { propertyCode: string; checkIn?: string; checkOut?: string; day?: string }) {
  const [property] = await db.select({ id: properties.id }).from(properties).where(eq(properties.code, input.propertyCode));
  if (!property) throw new NotFoundError("Resort");
  const rooms =
    input.checkIn && input.checkOut && isDate(input.checkIn) && isDate(input.checkOut) && input.checkOut > input.checkIn
      ? (await searchStays(db, property.id, input.checkIn, input.checkOut)).map((o) => ({ code: o.code, free: o.closedReason ? 0 : o.freeUnits, note: o.closedReason }))
      : [];
  const passes = input.day && isDate(input.day)
    ? await (async () => {
        const seats = await seatsLeft(db, property.id, input.day!);
        const codes = seats.length ? await db.select({ id: offerings.id, code: offerings.code }).from(offerings).where(inArray(offerings.id, seats.map((s) => s.offeringId))) : [];
        // A package's seats are its first open slot's.
        const byCode = new Map<string, { code: string; left: number; note: string | null }>();
        for (const seat of seats) {
          const code = codes.find((c) => c.id === seat.offeringId)!.code;
          if (!byCode.has(code)) byCode.set(code, { code, left: seat.closedReason ? 0 : seat.left, note: seat.closedReason });
        }
        return [...byCode.values()];
      })()
    : [];
  return { rooms, passes };
}

export type WebsiteBookingInput = {
  propertyCode: string;
  stay?: { checkIn: string; checkOut: string; rooms: { code: string; party: Party }[] };
  day?: { date: string; passes: { code: string; party: Party }[] };
  guest: GuestInput;
  notes?: string;
  marketing: boolean;
  acceptedTerms: boolean;
  ip?: string | null;
};

export type WebsiteBookingStarted = {
  number: string;
  /** The guest's private link token. Only its hash is kept. */
  token: string;
  quote: Quote;
  holdExpiresAt: string;
  dueNowPaise: number;
  checkout: { keyId: string; orderId: string; amountPaise: number; mode: "test" | "live" };
  resortName: string;
};

/**
 * Holds the guest's rooms or seats, books them as waiting for payment, and
 * opens a Razorpay order for the advance (the resort's share, the whole
 * price by default). A rate still to be confirmed can't be paid online, so
 * the hold is let go and the site sends the request on WhatsApp instead.
 */
export async function bookOnline(db: Database, input: WebsiteBookingInput): Promise<WebsiteBookingStarted> {
  if (!input.acceptedTerms) throw new RuleError("Please accept the booking terms.");
  if (input.guest.name.trim().length < 2) throw new RuleError("Add your name.");
  const phone = normalisePhone(input.guest.phone);
  if (!phone || phone.length < 11) throw new RuleError("Add a mobile number with 10 digits.");
  if (input.guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.guest.email.trim())) throw new RuleError("Check the email address.");
  const gstin = input.guest.companyGstin?.trim().toUpperCase();
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) throw new RuleError("Check the GSTIN: it has 15 letters and digits.");

  const [property] = await db.select().from(properties).where(eq(properties.code, input.propertyCode));
  if (!property?.active) throw new NotFoundError("Resort");
  if (!(await paymentAccount(db, property.id))) throw new RuleError("This resort takes requests on WhatsApp for now.");

  let held;
  if (input.stay && input.stay.rooms.length) {
    const codes = [...new Set(input.stay.rooms.map((r) => r.code))];
    const types = await db
      .select({ id: roomTypes.id, code: roomTypes.code })
      .from(roomTypes)
      .where(and(eq(roomTypes.propertyId, property.id), inArray(roomTypes.code, codes), eq(roomTypes.status, "active"), eq(roomTypes.onWebsite, true)));
    if (types.length !== codes.length) throw new RuleError("One of these rooms can't be booked online. Please send the request instead.");
    held = await holdStay(db, {
      propertyId: property.id,
      checkIn: input.stay.checkIn,
      checkOut: input.stay.checkOut,
      rooms: input.stay.rooms.map((room) => ({ roomTypeId: types.find((t) => t.code === room.code)!.id, party: room.party })),
    });
  } else if (input.day && input.day.passes.length) {
    const codes = [...new Set(input.day.passes.map((p) => p.code))];
    const slots = await db
      .select({ slotId: offeringSlots.id, code: offerings.code })
      .from(offeringSlots)
      .innerJoin(offerings, eq(offerings.id, offeringSlots.offeringId))
      .where(and(eq(offerings.propertyId, property.id), inArray(offerings.code, codes), eq(offerings.active, true), eq(offeringSlots.active, true)))
      .orderBy(asc(offeringSlots.sortOrder), asc(offeringSlots.label));
    const slotFor = (code: string) => slots.find((s) => s.code === code)?.slotId;
    if (codes.some((code) => !slotFor(code))) throw new RuleError("One of these passes can't be booked online. Please send the request instead.");
    held = await holdSeats(db, { propertyId: property.id, day: input.day.date, seats: input.day.passes.map((pass) => ({ slotId: slotFor(pass.code)!, party: pass.party })) });
  } else {
    throw new RuleError("Choose a room or a pass first.");
  }

  if (held.quote.totalPaise === null) {
    await releaseHold(db, held.holdId);
    throw new RuleError("A rate for these guests is to be confirmed by the team. Please send the request instead.");
  }

  const consent: ConsentJson = { termsVersion, marketing: input.marketing, at: new Date().toISOString(), ip: input.ip ?? null };
  const { bookingId, number } = await createBooking(db, {
    holdId: held.holdId,
    guest: { ...input.guest, companyGstin: gstin },
    source: "website",
    notes: input.notes?.trim() || undefined,
    consent,
  });
  const { token, hash } = newToken();
  await db.update(bookings).set({ manageTokenHash: hash }).where(eq(bookings.id, bookingId));

  const total = held.quote.totalPaise;
  // The advance, rounded up to the rupee, and never more than the total.
  const dueNowPaise = Math.min(total, Math.ceil((total * property.advancePercent) / 100 / 100) * 100);
  const checkout = await startCheckout(db, { bookingId, amountPaise: dueNowPaise });
  return {
    number,
    token,
    quote: held.quote,
    holdExpiresAt: held.expiresAt.toISOString(),
    dueNowPaise,
    checkout: { keyId: checkout.keyId, orderId: checkout.orderId, amountPaise: checkout.amountPaise, mode: checkout.mode },
    resortName: property.name,
  };
}

/** What the guest's private page shows: the booking, its payments and its invoices. Null for an unknown link. */
export async function bookingForGuest(db: Database, token: string) {
  if (!token || token.length < 20) return null;
  const [booking] = await db.select().from(bookings).where(eq(bookings.manageTokenHash, hashToken(token)));
  if (!booking) return null;
  const [property] = await db.select().from(properties).where(eq(properties.id, booking.propertyId));
  const [guest] = await db.select().from(guests).where(eq(guests.id, booking.guestId));
  const [hold] = await db.select({ expiresAt: holds.expiresAt, status: holds.status }).from(holds).where(eq(holds.bookingId, booking.id)).orderBy(desc(holds.createdAt)).limit(1);
  const items = await db
    .select({ id: bookingItems.id, kind: bookingItems.kind, roomType: roomTypes.name, unit: units.name, offering: offerings.name, slot: offeringSlots.label, party: bookingItems.party, amountPaise: bookingItems.amountPaise })
    .from(bookingItems)
    .leftJoin(roomTypes, eq(roomTypes.id, bookingItems.roomTypeId))
    .leftJoin(units, eq(units.id, bookingItems.unitId))
    .leftJoin(offerings, eq(offerings.id, bookingItems.offeringId))
    .leftJoin(offeringSlots, eq(offeringSlots.id, bookingItems.slotId))
    .where(eq(bookingItems.bookingId, booking.id))
    .orderBy(asc(bookingItems.sortOrder));
  const payments = await db
    .select({ id: onlinePayments.id, amountPaise: onlinePayments.amountPaise, status: onlinePayments.status, paidAt: onlinePayments.paidAt, method: onlinePayments.method, via: onlinePayments.via })
    .from(onlinePayments)
    .where(and(eq(onlinePayments.bookingId, booking.id), eq(onlinePayments.status, "paid")))
    .orderBy(asc(onlinePayments.paidAt));
  const docs = await db
    .select({ id: invoices.id, kind: invoices.kind, number: invoices.number, issuedOn: invoices.issuedOn, totalPaise: invoices.totalPaise })
    .from(invoices)
    .where(eq(invoices.bookingId, booking.id))
    .orderBy(asc(invoices.createdAt));
  return {
    number: booking.number,
    status: booking.status,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    visitDate: booking.visitDate,
    subtotalPaise: booking.subtotalPaise,
    taxPaise: booking.taxPaise,
    totalPaise: booking.totalPaise,
    paidPaise: booking.paidPaise,
    refundedPaise: booking.refundedPaise,
    balancePaise: booking.totalPaise === null ? null : Math.max(0, booking.totalPaise - booking.paidPaise),
    holdExpiresAt: booking.status === "pending_payment" && hold?.status === "active" ? hold.expiresAt.toISOString() : null,
    quote: booking.quote as Quote,
    guest: { name: guest.name, phone: guest.phone, email: guest.email },
    resort: { code: property.code, name: property.name, phone: property.phone, email: property.email, checkInTime: property.checkInTime, checkOutTime: property.checkOutTime },
    items,
    payments,
    invoices: docs,
  };
}

export type GuestBooking = NonNullable<Awaited<ReturnType<typeof bookingForGuest>>>;

/** A Razorpay order for what the guest still owes, from their private page. */
export async function payBalanceOnline(db: Database, token: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.manageTokenHash, hashToken(token)));
  if (!booking) throw new NotFoundError("Booking");
  if (!["pending_payment", "part_paid", "confirmed", "checked_in"].includes(booking.status)) throw new RuleError("This booking can't take a payment.");
  if (booking.totalPaise === null) throw new RuleError("The team will confirm the price first.");
  const balance = booking.totalPaise - booking.paidPaise;
  if (balance < 100) throw new RuleError("Nothing is left to pay.");
  if (booking.status === "pending_payment") {
    const [hold] = await db.select().from(holds).where(and(eq(holds.bookingId, booking.id), eq(holds.status, "active")));
    if (!hold || hold.expiresAt.getTime() <= Date.now()) throw new RuleError("The time to pay has run out. Please book again.");
  }
  const checkout = await startCheckout(db, { bookingId: booking.id, amountPaise: balance });
  return { keyId: checkout.keyId, orderId: checkout.orderId, amountPaise: checkout.amountPaise, mode: checkout.mode, number: booking.number };
}

/** An invoice the guest may open from their page, or null. */
export async function invoiceForGuest(db: Database, token: string, invoiceId: string) {
  const [booking] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.manageTokenHash, hashToken(token)));
  if (!booking) return null;
  const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.bookingId, booking.id)));
  return invoice ?? null;
}

/** Issues a fresh private link for a booking, for staff to send again. The old link stops working. */
export async function newManageLink(db: Database, bookingId: string) {
  const { token, hash } = newToken();
  await db.update(bookings).set({ manageTokenHash: hash }).where(eq(bookings.id, bookingId));
  return token;
}

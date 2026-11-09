import { createHmac, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  addons,
  ageBands,
  bookingItems,
  bookings,
  cancellationRules,
  dateRates,
  defaultTaxRules,
  holds,
  invoices,
  leads,
  messages,
  onlinePayments,
  properties,
  rates,
  refunds,
  roomTypes,
  taxRules,
  units,
  webhookEvents,
  type Database,
} from "@repo/db";
import { createTestDatabase } from "@repo/db/testing";
import {
  bookingForGuest,
  bookOnline,
  changeBookingStatus,
  changeStay,
  completeCheckout,
  createBooking,
  createPaymentLink,
  decideRefund,
  decryptSecret,
  encryptSecret,
  expireHolds,
  financialYear,
  handleRazorpayWebhook,
  holdStay,
  loadCancellationRules,
  paymentAccount,
  quoteSeats,
  quoteStay,
  recheckOnlinePayments,
  requestRefund,
  savePaymentAccount,
  sendQueuedEmails,
  setBookingPrice,
  setRazorpayClient,
  suggestRefund,
  todayInIndia,
  type Razorpay,
} from "../src";

/*
 * GST, invoices, Razorpay and refunds, against a real Postgres and a fake
 * Razorpay that signs its answers as the real one does.
 */

const SECRET = "fake_key_secret";
const WEBHOOK = "fake_webhook_secret";
process.env.PAYMENT_KEYS_SECRET = randomBytes(32).toString("base64");
process.env.RAZORPAY_KEY_ID = "rzp_test_fake";
process.env.RAZORPAY_KEY_SECRET = SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK;

/** A tiny Razorpay: orders, payments, links and refunds in memory. */
function fakeRazorpay() {
  let n = 0;
  const orders = new Map<string, { id: string; amount: number }>();
  const payments = new Map<string, { id: string; order_id: string | null; amount: number; status: "authorized" | "captured"; method: string }>();
  const links = new Map<string, { id: string; amount: number; status: "created" | "paid"; payments: { payment_id: string; amount: number; status: string; method: string }[] }>();
  const refundsMade: { id: string; payment_id: string; amount: number }[] = [];
  const api: Razorpay = {
    createOrder: async ({ amount }) => {
      const order = { id: `order_${++n}`, amount, status: "created" as const };
      orders.set(order.id, order);
      return order;
    },
    orderPayments: async (orderId) => [...payments.values()].filter((p) => p.order_id === orderId),
    payment: async (id) => payments.get(id)!,
    capture: async (id) => {
      const p = payments.get(id)!;
      p.status = "captured";
      return p;
    },
    createLink: async ({ amount }) => {
      const link = { id: `plink_${++n}`, amount, status: "created" as const, payments: [], short_url: `https://rzp.io/i/${n}` };
      links.set(link.id, link);
      return link;
    },
    link: async (id) => ({ ...links.get(id)!, short_url: "" }),
    refund: async (paymentId, { amount }) => {
      const refund = { id: `rfnd_${++n}`, payment_id: paymentId, amount, status: "processed" as const };
      refundsMade.push(refund);
      return refund;
    },
    refundStatus: async (_p, id) => ({ ...refundsMade.find((r) => r.id === id)!, status: "processed" as const }),
  };
  return {
    api,
    refundsMade,
    /** The guest pays an order; returns what checkout hands the browser. */
    pay(orderId: string, status: "authorized" | "captured" = "captured") {
      const order = orders.get(orderId)!;
      const payment = { id: `pay_${++n}`, order_id: orderId, amount: order.amount, status, method: "upi" };
      payments.set(payment.id, payment);
      return { orderId, paymentId: payment.id, signature: createHmac("sha256", SECRET).update(`${orderId}|${payment.id}`).digest("hex") };
    },
    payLink(linkId: string) {
      const link = links.get(linkId)!;
      const payment = { id: `pay_${++n}`, order_id: null, amount: link.amount, status: "captured" as const, method: "card" };
      payments.set(payment.id, payment);
      link.status = "paid";
      link.payments.push({ payment_id: payment.id, amount: link.amount, status: "captured", method: "card" });
      return payment;
    },
  };
}

const fake = fakeRazorpay();
setRazorpayClient(() => fake.api);

let db: Database;
let drop: () => Promise<void>;
let propertyId: string;
let roomId: string; // ₹5,000 a weekday night, two units
let villaId: string; // ₹9,000 a weekday night, one unit
const couple = { adults: 2, children: {} };
const guest = { name: "Asha Kulkarni", phone: "98200 12345", email: "asha@example.com" };
const online = (checkIn: string, checkOut: string, code = "room") => ({
  propertyCode: "SB",
  stay: { checkIn, checkOut, rooms: [{ code, party: couple }] },
  guest,
  marketing: false,
  acceptedTerms: true,
});
const bookingOf = async (number: string) => (await db.select().from(bookings).where(eq(bookings.number, number)))[0];
const signed = (body: object) => {
  const text = JSON.stringify(body);
  return { body: text, signature: createHmac("sha256", WEBHOOK).update(text).digest("hex") };
};

beforeAll(async () => {
  ({ db, drop } = await createTestDatabase());
  [{ id: propertyId }] = await db
    .insert(properties)
    .values({ code: "SB", name: "Sinhagad Bliss", legalName: "Sinhagad Bliss Resorts LLP", gstin: "27ABCDE1234F1Z5" })
    .returning({ id: properties.id });
  await db.insert(ageBands).values({ propertyId, code: "infant", label: "Under 3", minAge: 0, maxAge: 2, free: true });
  await db.insert(taxRules).values(defaultTaxRules.map((rule) => ({ propertyId, ...rule })));
  await db.insert(cancellationRules).values([
    { propertyId, daysBefore: 8, refundPercent: 100 },
    { propertyId, daysBefore: 3, refundPercent: 50 },
    { propertyId, daysBefore: 0, refundPercent: 0 },
  ]);
  const types = await db
    .insert(roomTypes)
    .values([
      { propertyId, code: "room", name: "Valley Room", maxGuests: 3 },
      { propertyId, code: "villa", name: "Pool Villa", maxGuests: 4 },
    ])
    .returning();
  [roomId, villaId] = [types[0].id, types[1].id];
  await db.insert(units).values([
    { propertyId, roomTypeId: roomId, name: "Room 1" },
    { propertyId, roomTypeId: roomId, name: "Room 2" },
    { propertyId, roomTypeId: villaId, name: "Villa 1" },
  ]);
  await db.insert(rates).values([
    { propertyId, roomTypeId: roomId, basePaise: 500_000 },
    { propertyId, roomTypeId: villaId, basePaise: 900_000 },
  ]);
});

afterAll(async () => {
  await drop?.();
});

describe("GST", () => {
  it("charges 5% on a ₹5,000 night and 18% on a ₹9,000 night", async () => {
    const room = await quoteStay(db, { propertyId, checkIn: "2027-03-01", checkOut: "2027-03-03", rooms: [{ roomTypeId: roomId, party: couple }] });
    expect(room).toMatchObject({ subtotalPaise: 1_000_000, taxPaise: 50_000, totalPaise: 1_050_000 });
    const villa = await quoteStay(db, { propertyId, checkIn: "2027-03-01", checkOut: "2027-03-02", rooms: [{ roomTypeId: villaId, party: couple }] });
    expect(villa).toMatchObject({ subtotalPaise: 900_000, taxPaise: 162_000, totalPaise: 1_062_000 });
  });

  it("taxes each night by its own price, so one stay can mix rates", async () => {
    await db.insert(dateRates).values({ propertyId, roomTypeId: villaId, night: "2027-03-08", basePaise: 700_000 });
    const quote = await quoteStay(db, { propertyId, checkIn: "2027-03-08", checkOut: "2027-03-10", rooms: [{ roomTypeId: villaId, party: couple }] });
    expect(quote.tax?.map((t) => [t.rateBps, t.taxablePaise, t.taxPaise])).toEqual([
      [500, 700_000, 35_000],
      [1800, 900_000, 162_000],
    ]);
    expect(quote.totalPaise).toBe(1_600_000 + 197_000);
  });

  it("taxes a price set by staff, which can move a night into a lower band", async () => {
    const hold = await holdStay(db, { propertyId, checkIn: "2027-03-15", checkOut: "2027-03-16", rooms: [{ roomTypeId: villaId, party: couple }] });
    const { bookingId } = await createBooking(db, { holdId: hold.holdId, guest, source: "phone", priceOverride: { subtotalPaise: 700_000, reason: "Regular guest" }, confirm: true });
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    expect(booking).toMatchObject({ subtotalPaise: 700_000, taxPaise: 35_000, totalPaise: 735_000 });

    // Confirmed, so it has an invoice that adds up to the booking.
    const [invoice] = await db.select().from(invoices).where(eq(invoices.bookingId, bookingId));
    expect(invoice).toMatchObject({ kind: "invoice", taxablePaise: 700_000, cgstPaise: 17_500, sgstPaise: 17_500, totalPaise: 735_000 });
    expect(invoice.number).toMatch(/^SB\/\d{4}\/000001$/);
    expect(invoice.seller).toMatchObject({ name: "Sinhagad Bliss Resorts LLP", gstin: "27ABCDE1234F1Z5" });

    // A new price credits that invoice in full and issues a new one.
    await setBookingPrice(db, { bookingId, subtotalPaise: 800_000, reason: "Breakfast added" });
    const all = await db.select().from(invoices).where(eq(invoices.bookingId, bookingId)).orderBy(invoices.createdAt);
    expect(all.map((i) => [i.kind, i.totalPaise])).toEqual([
      ["invoice", 735_000],
      ["credit_note", 735_000],
      ["invoice", 944_000], // ₹8,000 is above ₹7,500, so 18%
    ]);
    expect(all[1].number).toMatch(/^SB\/CN\/\d{4}\/00001$/);
    expect(all[1].invoiceId).toBe(all[0].id);
  });

  it("counts financial years from April", () => {
    expect(financialYear("2027-03-31")).toBe("2026-27");
    expect(financialYear("2027-04-01")).toBe("2027-28");
  });
});

describe("Payment accounts", () => {
  it("encrypts keys, and a resort's own keys win over the shared ones", async () => {
    const sealed = encryptSecret("abc");
    expect(sealed).not.toContain("abc");
    expect(decryptSecret(sealed)).toBe("abc");
    expect(await paymentAccount(db, propertyId)).toMatchObject({ keyId: "rzp_test_fake", source: "env" });
    await expect(savePaymentAccount(db, { propertyId, keyId: "nope", keySecret: "x", active: true })).rejects.toThrow(/rzp_test_/);
    await savePaymentAccount(db, { propertyId, keyId: "rzp_test_own", keySecret: SECRET, webhookSecret: WEBHOOK, active: true });
    expect(await paymentAccount(db, propertyId)).toMatchObject({ keyId: "rzp_test_own", keySecret: SECRET, webhookSecret: WEBHOOK, source: "admin" });
  });
});

describe("Booking on the website", () => {
  it("books, takes the payment once, confirms and invoices", async () => {
    const started = await bookOnline(db, online("2027-04-05", "2027-04-07"));
    expect(started).toMatchObject({ dueNowPaise: 1_050_000, checkout: { amountPaise: 1_050_000 } });
    expect(await bookingOf(started.number)).toMatchObject({ status: "pending_payment", source: "website", totalPaise: 1_050_000, consent: { marketing: false } });

    const answer = fake.pay(started.checkout.orderId);
    await expect(completeCheckout(db, { ...answer, signature: "0".repeat(64) })).rejects.toThrow(/couldn't be verified/);
    await completeCheckout(db, answer);
    await completeCheckout(db, answer); // the browser sends it twice
    expect(await bookingOf(started.number)).toMatchObject({ status: "confirmed", paidPaise: 1_050_000 });

    // The guest's private page.
    const page = await bookingForGuest(db, started.token);
    expect(page).toMatchObject({ number: started.number, status: "confirmed", balancePaise: 0 });
    expect(page?.invoices).toHaveLength(1);
    expect(await bookingForGuest(db, "x".repeat(32))).toBeNull();
  });

  it("captures a payment that was only authorised", async () => {
    const started = await bookOnline(db, online("2027-04-12", "2027-04-13"));
    await completeCheckout(db, fake.pay(started.checkout.orderId, "authorized"));
    expect(await bookingOf(started.number)).toMatchObject({ status: "confirmed" });
  });

  it("takes an advance, then the balance by a payment link and its webhook, once", async () => {
    await db.update(properties).set({ advancePercent: 30 }).where(eq(properties.id, propertyId));
    const started = await bookOnline(db, online("2027-04-19", "2027-04-21"));
    await db.update(properties).set({ advancePercent: 100 }).where(eq(properties.id, propertyId));
    expect(started.dueNowPaise).toBe(315_000);
    await completeCheckout(db, fake.pay(started.checkout.orderId));
    const booking = await bookingOf(started.number);
    expect(booking).toMatchObject({ status: "part_paid", paidPaise: 315_000 });

    const link = await createPaymentLink(db, { bookingId: booking.id });
    expect(link.amountPaise).toBe(735_000);
    const payment = fake.payLink(link.linkId!);
    const event = signed({ event: "payment_link.paid", payload: { payment_link: { entity: { id: link.linkId } }, payment: { entity: payment } } });
    await expect(handleRazorpayWebhook(db, { propertyCode: "SB", ...event, signature: "bad", eventId: "evt_1" })).rejects.toThrow(/signature/);
    expect(await handleRazorpayWebhook(db, { propertyCode: "SB", ...event, eventId: "evt_1" })).toEqual({ duplicate: false });
    expect(await handleRazorpayWebhook(db, { propertyCode: "SB", ...event, eventId: "evt_1" })).toEqual({ duplicate: true });
    expect(await bookingOf(started.number)).toMatchObject({ status: "confirmed", paidPaise: 1_050_000 });
    expect(await db.$count(webhookEvents)).toBe(1);
  });

  it("finds a payment whose answer never came back", async () => {
    const started = await bookOnline(db, online("2027-04-26", "2027-04-27"));
    fake.pay(started.checkout.orderId);
    await recheckOnlinePayments(db);
    expect(await bookingOf(started.number)).toMatchObject({ status: "confirmed" });
  });

  it("refuses a rate to confirm, and lets the hold go", async () => {
    const [type] = await db.insert(roomTypes).values({ propertyId, code: "tent", name: "Tent" }).returning();
    await db.insert(units).values({ propertyId, roomTypeId: type.id, name: "Tent 1" });
    await expect(bookOnline(db, online("2027-05-03", "2027-05-04", "tent"))).rejects.toThrow(/to be confirmed/);
    expect(await db.$count(holds, eq(holds.status, "active"))).toBe(0);
  });
});

describe("Emails", () => {
  it("holds the confirmation until payment, cancels it if none comes, and waits without a Resend key", async () => {
    const paid = await bookOnline(db, { ...online("2027-07-05", "2027-07-06"), siteOrigin: "https://example.test" });
    const unpaid = await bookOnline(db, { ...online("2027-07-12", "2027-07-13"), siteOrigin: "https://example.test" });
    const mail = async (number: string) => {
      const booking = await bookingOf(number);
      return db.select().from(messages).where(eq(messages.bookingId, booking.id));
    };
    expect((await mail(paid.number)).map((m) => m.status)).toEqual(["held"]);
    expect((await mail(paid.number))[0].html).toContain(`https://example.test/booking?ref=${paid.token}`);

    await completeCheckout(db, fake.pay(paid.checkout.orderId));
    expect((await mail(paid.number)).map((m) => m.status)).toEqual(["queued"]);

    await db.update(holds).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(holds.status, "active"));
    await expireHolds(db);
    expect((await mail(unpaid.number)).map((m) => m.status)).toEqual(["cancelled"]);

    expect(await sendQueuedEmails(db)).toMatchObject({ sent: 0, waiting: true });
  });
});

describe("Late payments", () => {
  const expireAll = async () => {
    await db.update(holds).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(holds.status, "active"));
    await expireHolds(db);
  };

  it("gives the rooms back to a guest who pays after the hold ran out, while they're free", async () => {
    const started = await bookOnline(db, online("2027-05-10", "2027-05-11", "villa"));
    await expireAll();
    expect(await bookingOf(started.number)).toMatchObject({ status: "expired" });
    // The unpaid website booking became a lead for sales.
    expect(await db.$count(leads, eq(leads.source, "website_booking"))).toBeGreaterThan(0);
    await completeCheckout(db, fake.pay(started.checkout.orderId));
    expect(await bookingOf(started.number)).toMatchObject({ status: "confirmed", paidPaise: 1_062_000 });
  });

  it("refunds a guest who pays after someone else took the room", async () => {
    const late = await bookOnline(db, online("2027-05-17", "2027-05-18", "villa"));
    await expireAll();
    const other = await bookOnline(db, { ...online("2027-05-17", "2027-05-18", "villa"), guest: { ...guest, phone: "9811111111" } });
    await completeCheckout(db, fake.pay(other.checkout.orderId));
    await completeCheckout(db, fake.pay(late.checkout.orderId));
    expect(await bookingOf(late.number)).toMatchObject({ status: "expired", paidPaise: 0, refundedPaise: 1_062_000 });
    expect(fake.refundsMade.at(-1)).toMatchObject({ amount: 1_062_000 });
  });
});

describe("Refunds", () => {
  it("suggests a refund from the cancellation rules", async () => {
    const rules = await loadCancellationRules(db, propertyId);
    const booking = { checkIn: "2027-06-20", visitDate: null, paidPaise: 100_000 };
    expect(suggestRefund(rules, booking, "2027-06-01")).toMatchObject({ refundPercent: 100, amountPaise: 100_000 });
    expect(suggestRefund(rules, booking, "2027-06-15")).toMatchObject({ refundPercent: 50, amountPaise: 50_000 });
    expect(suggestRefund(rules, booking, "2027-06-19")).toMatchObject({ refundPercent: 0, amountPaise: 0 });
    expect(suggestRefund([], booking, "2027-06-19")).toBeNull();
  });

  it("waits for approval, refunds through Razorpay, credits the invoice and marks the booking refunded", async () => {
    const started = await bookOnline(db, online("2027-06-07", "2027-06-08"));
    await completeCheckout(db, fake.pay(started.checkout.orderId));
    const booking = await bookingOf(started.number);
    await changeBookingStatus(db, { bookingId: booking.id, to: "cancelled", note: "Plans changed" });

    // Nothing paid is kept yet, so the invoice stays as it was until the money goes back.
    const refund = await requestRefund(db, { bookingId: booking.id, amountPaise: booking.paidPaise, reason: "Cancelled 30 days ahead", method: "razorpay", canInitiate: true });
    expect(refund.status).toBe("requested");
    await expect(requestRefund(db, { bookingId: booking.id, amountPaise: 100, reason: "Again", method: "razorpay" })).rejects.toThrow(/left to refund/);
    await decideRefund(db, { refundId: refund.id, approve: true });
    expect(await bookingOf(started.number)).toMatchObject({ status: "refunded", paidPaise: 0, refundedPaise: 525_000 });
    expect(await db.$count(messages, and(eq(messages.bookingId, booking.id), eq(messages.kind, "refund")))).toBe(1);
    const docs = await db.select().from(invoices).where(eq(invoices.bookingId, booking.id));
    const net = docs.reduce((sum, d) => sum + (d.kind === "invoice" ? d.totalPaise : -d.totalPaise), 0);
    expect(net).toBe(0);
  });

  it("keeps the invoice for money the resort keeps, and goes through at once within the limit", async () => {
    await db.update(properties).set({ refundApprovalPaise: 300_000 }).where(eq(properties.id, propertyId));
    const started = await bookOnline(db, online("2027-06-14", "2027-06-15"));
    await completeCheckout(db, fake.pay(started.checkout.orderId));
    const booking = await bookingOf(started.number);
    await changeBookingStatus(db, { bookingId: booking.id, to: "cancelled" });
    const refund = await requestRefund(db, { bookingId: booking.id, amountPaise: 262_500, reason: "Half back, 5 days ahead", method: "cash", canInitiate: true });
    expect(refund.status).toBe("processed");
    expect(await bookingOf(started.number)).toMatchObject({ status: "cancelled", paidPaise: 262_500 });
    const docs = await db.select().from(invoices).where(eq(invoices.bookingId, booking.id));
    const net = docs.reduce((sum, d) => sum + (d.kind === "invoice" ? d.totalPaise : -d.totalPaise), 0);
    expect(net).toBe(262_500);
    expect(await db.$count(refunds, and(eq(refunds.bookingId, booking.id), eq(refunds.status, "processed")))).toBe(1);
    expect(await db.$count(onlinePayments, eq(onlinePayments.bookingId, booking.id))).toBe(1);
    expect(todayInIndia()).toMatch(/^\d{4}-/);
  });
});

describe("Add-ons", () => {
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    const rows = await db
      .insert(addons)
      .values([
        { propertyId, code: "bbq", name: "Barbecue dinner", basis: "person", pricePaise: 80_000, soldWith: "both", maxQuantity: 8 },
        { propertyId, code: "decor", name: "Room decoration", basis: "unit", pricePaise: 250_000, soldWith: "stay" },
        { propertyId, code: "mattress", name: "Extra mattress", basis: "night", pricePaise: 60_000, soldWith: "stay" },
        { propertyId, code: "desk", name: "Cake", basis: "unit", pricePaise: 90_000, onWebsite: false },
      ])
      .returning();
    for (const row of rows) ids[row.code] = row.id;
  });

  it("prices per person, per unit and per night, with 18% GST on top of the room's 5%", async () => {
    const quote = await quoteStay(db, {
      propertyId,
      checkIn: "2027-05-03",
      checkOut: "2027-05-05",
      rooms: [{ roomTypeId: roomId, party: couple }],
      addons: [
        { addonId: ids.bbq, quantity: 2 },
        { addonId: ids.mattress, quantity: 1 },
      ],
    });
    const extras = quote.lines.filter((l) => l.kind === "addon");
    expect(extras.map((l) => [l.addonName, l.quantity, l.nights, l.totalPaise])).toEqual([
      ["Barbecue dinner", 2, 1, 160_000],
      ["Extra mattress", 1, 2, 120_000],
    ]);
    // Rooms ₹10,000 at 5%, add-ons ₹2,800 at 18%.
    expect(quote).toMatchObject({ subtotalPaise: 1_280_000, taxPaise: 50_000 + 50_400, totalPaise: 1_380_400 });
  });

  it("refuses add-ons for the wrong kind of booking, over their limit, off sale, or kept off the website", async () => {
    const stay = { propertyId, checkIn: "2027-05-03", checkOut: "2027-05-04", rooms: [{ roomTypeId: roomId, party: couple }] };
    await expect(quoteSeats(db, { propertyId, day: "2027-05-03", seats: [], addons: [{ addonId: ids.decor, quantity: 1 }] })).rejects.toThrow();
    await expect(quoteStay(db, { ...stay, addons: [{ addonId: ids.bbq, quantity: 9 }] })).rejects.toThrow(/at most 8/);
    await expect(quoteStay(db, { ...stay, addons: [{ addonId: ids.desk, quantity: 1 }], website: true })).rejects.toThrow(/not on sale/);
    expect((await quoteStay(db, { ...stay, addons: [{ addonId: ids.desk, quantity: 1 }] })).subtotalPaise).toBe(500_000 + 90_000);
    await db.update(addons).set({ active: false }).where(eq(addons.id, ids.decor));
    await expect(quoteStay(db, { ...stay, addons: [{ addonId: ids.decor, quantity: 1 }] })).rejects.toThrow(/not on sale/);
    await db.update(addons).set({ active: true }).where(eq(addons.id, ids.decor));
  });

  it("books add-ons on the website by code, and invoices them at their own rate", async () => {
    const started = await bookOnline(db, { ...online("2027-05-10", "2027-05-11"), addons: [{ code: "decor", quantity: 1 }] });
    expect(started.dueNowPaise).toBe(525_000 + 295_000);
    await expect(bookOnline(db, { ...online("2027-05-10", "2027-05-11"), addons: [{ code: "desk", quantity: 1 }] })).rejects.toThrow(/not on sale/);
    await completeCheckout(db, fake.pay(started.checkout.orderId));
    const booking = await bookingOf(started.number);
    const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, booking.id));
    expect(items.find((i) => i.kind === "addon")).toMatchObject({ addonId: ids.decor, quantity: 1, amountPaise: 250_000 });
    const [invoice] = await db.select().from(invoices).where(eq(invoices.bookingId, booking.id));
    expect(invoice.lines.map((l) => [l.description, l.quantity, l.unit, l.rateBps, l.taxPaise])).toEqual([
      ["Valley Room, 10 May 2027 to 11 May 2027", 1, "night", 500, 25_000],
      ["Room decoration", 1, "unit", 1800, 45_000],
    ]);
    const page = await bookingForGuest(db, started.token);
    expect(page?.items.map((i) => i.title)).toEqual(["Valley Room", "Room decoration (1 unit)"]);
  });

  it("keeps a stay's add-ons when its dates change, with per-night ones over the new nights", async () => {
    const hold = await holdStay(db, { propertyId, checkIn: "2027-05-17", checkOut: "2027-05-18", rooms: [{ roomTypeId: roomId, party: couple }], addons: [{ addonId: ids.mattress, quantity: 1 }, { addonId: ids.bbq, quantity: 2 }] });
    const { bookingId } = await createBooking(db, { holdId: hold.holdId, guest, source: "phone", confirm: true });
    await db.update(addons).set({ pricePaise: 99_900 }).where(eq(addons.id, ids.mattress)); // a new price doesn't touch this booking
    await changeStay(db, { bookingId, checkIn: "2027-05-17", checkOut: "2027-05-20", rooms: [{ roomTypeId: roomId, party: couple }], reason: "Staying longer" });
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    // Rooms ₹15,000 at 5%; mattress ₹600 × 3 nights and barbecue ₹1,600 at 18%.
    expect(booking).toMatchObject({ subtotalPaise: 1_500_000 + 180_000 + 160_000, taxPaise: 75_000 + 61_200 });
    const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId));
    expect(items.filter((i) => i.kind === "addon").map((i) => i.amountPaise).sort()).toEqual([160_000, 180_000]);
  });
});

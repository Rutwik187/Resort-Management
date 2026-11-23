import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, ne, or, sql } from "drizzle-orm";
import {
  bookingEvents,
  bookingItems,
  bookings,
  getDb,
  guests,
  invoices,
  leads,
  offerings,
  offerUses,
  offers,
  offlinePayments,
  onlinePayments,
  properties,
  refunds,
  roomTypes,
  stayPackages,
  unitNights,
  units,
  user,
} from "@repo/db";
import type { BookingStatus } from "@repo/engine";
import { leadInterestLabel, leadSourceLabel, leadStatusLabel, methodLabel, sourceLabel, statusLabel } from "./format";
import type { Period } from "./reports";

/*
 * The reports of URD 7.4 as tables: each has columns, rows and a total
 * line, for the screen, Excel, CSV and print. Money is kept in paise and
 * shown in rupees. Every report takes one resort or several, and then
 * shows each resort and the group total. All dates are India time, and a
 * business day closes at midnight.
 */

export type ColumnKind = "text" | "money" | "number" | "percent" | "date";
export type Column = { key: string; label: string; kind?: ColumnKind };
export type Row = Record<string, string | number | null>;
export type ReportTable = { title: string; description: string; columns: Column[]; rows: Row[]; total?: Row; flagged?: (row: Row) => boolean };

/** Bookings that count as sales: money has come in, whatever happened next. */
const sold: BookingStatus[] = ["part_paid", "confirmed", "checked_in", "checked_out", "no_show"];
const indiaDay = (column: unknown) => sql<string>`(${column} at time zone 'Asia/Kolkata')::date::text`;
const bookedOn = indiaDay(bookings.createdAt);

async function resortNames(ids: string[]) {
  const rows = await getDb().select({ id: properties.id, name: properties.name, code: properties.code }).from(properties).where(inArray(properties.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}

const sum = (rows: Row[], key: string) => rows.reduce((total, row) => total + (typeof row[key] === "number" ? (row[key] as number) : 0), 0);
const totals = (rows: Row[], label: string, keys: string[], first = "label"): Row => Object.fromEntries([[first, label], ...keys.map((key) => [key, sum(rows, key)])]);
const headcount = (party: { adults: number; children?: Record<string, number> }) => party.adults + Object.values(party.children ?? {}).reduce((a, b) => a + (b ?? 0), 0);

/**
 * Sales (URD 7.4): bookings, room nights, guests, gross value, discounts,
 * taxes and net revenue, per resort and for the group. By booking date it
 * is what was sold in the period; by stay date it is the revenue that falls
 * in the period, each stay's amounts shared over its nights.
 */
export async function salesTable(propertyIds: string[], period: Period, view: "booked" | "stay"): Promise<ReportTable> {
  const db = getDb();
  const names = await resortNames(propertyIds);
  const where =
    view === "booked"
      ? and(inArray(bookings.propertyId, propertyIds), inArray(bookings.status, sold), sql`${bookedOn} between ${period.from} and ${period.to}`)
      : and(
          inArray(bookings.propertyId, propertyIds),
          inArray(bookings.status, sold),
          or(and(isNotNull(bookings.checkIn), lte(bookings.checkIn, period.to), sql`${bookings.checkOut} > ${period.from}::date`), and(gte(bookings.visitDate, period.from), lte(bookings.visitDate, period.to))),
        );
  const rows = await db.select({ booking: bookings }).from(bookings).where(where);
  const items = rows.length ? await db.select({ bookingId: bookingItems.bookingId, kind: bookingItems.kind, party: bookingItems.party }).from(bookingItems).where(inArray(bookingItems.bookingId, rows.map((r) => r.booking.id))) : [];
  const by = new Map<string, Row>();
  for (const { booking } of rows) {
    const stayNights = booking.checkIn && booking.checkOut ? Math.round((Date.parse(booking.checkOut) - Date.parse(booking.checkIn)) / 86_400_000) : 0;
    let share = 1;
    let nightsIn = stayNights;
    if (view === "stay" && booking.checkIn && booking.checkOut) {
      const start = booking.checkIn > period.from ? booking.checkIn : period.from;
      const endExclusive = booking.checkOut < nextDay(period.to) ? booking.checkOut : nextDay(period.to);
      nightsIn = Math.max(0, Math.round((Date.parse(endExclusive) - Date.parse(start)) / 86_400_000));
      share = stayNights ? nightsIn / stayNights : 1;
    }
    const own = items.filter((i) => i.bookingId === booking.id);
    const rooms = own.filter((i) => i.kind === "stay").length;
    const people = own.filter((i) => i.kind !== "addon").reduce((total, i) => total + headcount(i.party), 0);
    const row = by.get(booking.propertyId) ?? { label: names.get(booking.propertyId)?.name ?? "", bookings: 0, roomNights: 0, guests: 0, gross: 0, discounts: 0, taxes: 0, net: 0, total: 0 };
    const subtotal = booking.subtotalPaise ?? booking.totalPaise ?? 0;
    row.bookings = (row.bookings as number) + 1;
    row.roomNights = (row.roomNights as number) + rooms * nightsIn;
    row.guests = (row.guests as number) + people;
    row.gross = (row.gross as number) + Math.round((subtotal + booking.discountPaise) * share);
    row.discounts = (row.discounts as number) + Math.round(booking.discountPaise * share);
    row.taxes = (row.taxes as number) + Math.round((booking.taxPaise ?? 0) * share);
    row.net = (row.net as number) + Math.round(subtotal * share);
    row.total = (row.total as number) + Math.round((booking.totalPaise ?? 0) * share);
    by.set(booking.propertyId, row);
  }
  const list = propertyIds.map((id) => by.get(id) ?? { label: names.get(id)?.name ?? "", bookings: 0, roomNights: 0, guests: 0, gross: 0, discounts: 0, taxes: 0, net: 0, total: 0 });
  const keys = ["bookings", "roomNights", "guests", "gross", "discounts", "taxes", "net", "total"];
  return {
    title: view === "booked" ? "Sales by booking date" : "Sales by stay date",
    description:
      view === "booked"
        ? "What was sold in the period: paid bookings by the day they were made. Gross is the price before discounts; net is after discounts and before GST."
        : "The revenue that falls in the period: each stay's amounts shared over its nights, and day visits on their day.",
    columns: [
      { key: "label", label: "Resort" },
      { key: "bookings", label: "Bookings", kind: "number" },
      { key: "roomNights", label: "Room nights", kind: "number" },
      { key: "guests", label: "Guests", kind: "number" },
      { key: "gross", label: "Gross", kind: "money" },
      { key: "discounts", label: "Discounts", kind: "money" },
      { key: "taxes", label: "GST", kind: "money" },
      { key: "net", label: "Net revenue", kind: "money" },
      { key: "total", label: "With GST", kind: "money" },
    ],
    rows: list,
    total: list.length > 1 ? totals(list, "Group total", keys) : undefined,
  };
}

/** Paise rounded to the whole rupee, for averages. */
const wholeRupee = (paise: number) => Math.round(paise / 100) * 100;

const nextDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Every transaction in the period: online and at the resort, and refunds, with Razorpay's ids (URD 7.4: payment report). */
export async function paymentsTable(propertyIds: string[], period: Period): Promise<ReportTable> {
  const db = getDb();
  const names = await resortNames(propertyIds);
  const online = await db
    .select({ p: onlinePayments, number: bookings.number })
    .from(onlinePayments)
    .innerJoin(bookings, eq(bookings.id, onlinePayments.bookingId))
    .where(and(inArray(onlinePayments.propertyId, propertyIds), eq(onlinePayments.status, "paid"), sql`${indiaDay(onlinePayments.paidAt)} between ${period.from} and ${period.to}`));
  const offline = await db
    .select({ p: offlinePayments, number: bookings.number })
    .from(offlinePayments)
    .innerJoin(bookings, eq(bookings.id, offlinePayments.bookingId))
    .where(and(inArray(offlinePayments.propertyId, propertyIds), sql`${indiaDay(offlinePayments.receivedAt)} between ${period.from} and ${period.to}`));
  const back = await db
    .select({ r: refunds, number: bookings.number })
    .from(refunds)
    .innerJoin(bookings, eq(bookings.id, refunds.bookingId))
    .where(and(inArray(refunds.propertyId, propertyIds), sql`${indiaDay(sql`coalesce(${refunds.processedAt}, ${refunds.createdAt})`)} between ${period.from} and ${period.to}`));
  const rows: Row[] = [
    ...online.map(({ p, number }) => ({
      when: p.paidAt ? p.paidAt.toISOString() : null,
      resort: names.get(p.propertyId)?.code ?? "",
      booking: number,
      kind: "Online",
      method: p.method ?? "Razorpay",
      status: "Paid",
      amount: p.amountPaise,
      reference: p.paymentId,
      order: p.orderId ?? p.linkId,
    })),
    ...offline.map(({ p, number }) => ({
      when: p.receivedAt.toISOString(),
      resort: names.get(p.propertyId)?.code ?? "",
      booking: number,
      kind: "At the resort",
      method: methodLabel[p.method as keyof typeof methodLabel] ?? p.method,
      status: "Received",
      amount: p.amountPaise,
      reference: p.reference,
      order: null,
    })),
    ...back.map(({ r, number }) => ({
      when: (r.processedAt ?? r.createdAt).toISOString(),
      resort: names.get(r.propertyId)?.code ?? "",
      booking: number,
      kind: "Refund",
      method: r.onlinePaymentId ? "Razorpay" : (methodLabel[r.method as keyof typeof methodLabel] ?? r.method ?? ""),
      status: r.status,
      amount: -r.amountPaise,
      reference: r.providerRefundId ?? r.reference,
      order: null,
    })),
  ].sort((a, b) => String(a.when).localeCompare(String(b.when)));
  const shown = rows.map((row) => ({ ...row, when: row.when ? new Date(row.when as string).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "" }));
  return {
    title: "Payments",
    description: "Every payment and refund in the period, online through Razorpay or taken at the resort. Refunds show as minus amounts.",
    columns: [
      { key: "when", label: "When" },
      ...(propertyIds.length > 1 ? [{ key: "resort", label: "Resort" }] : []),
      { key: "booking", label: "Booking" },
      { key: "kind", label: "Kind" },
      { key: "method", label: "Method" },
      { key: "status", label: "Status" },
      { key: "amount", label: "Amount", kind: "money" as const },
      { key: "reference", label: "Payment or refund id" },
      { key: "order", label: "Order or link id" },
    ],
    rows: shown,
    total: { when: "Net received", amount: sum(rows, "amount") },
  };
}

/** Online payments in the period against Razorpay's settlements, with fees and GST on fees. Unsettled ones after 3 days are flagged (URD 7.4). */
export async function settlementsTable(propertyIds: string[], period: Period): Promise<ReportTable> {
  const db = getDb();
  const names = await resortNames(propertyIds);
  const rows = await db
    .select({ p: onlinePayments, number: bookings.number })
    .from(onlinePayments)
    .innerJoin(bookings, eq(bookings.id, onlinePayments.bookingId))
    .where(and(inArray(onlinePayments.propertyId, propertyIds), eq(onlinePayments.status, "paid"), sql`${indiaDay(onlinePayments.paidAt)} between ${period.from} and ${period.to}`))
    .orderBy(asc(onlinePayments.paidAt));
  const now = Date.now();
  const list: Row[] = rows.map(({ p, number }) => {
    const late = !p.settledAt && p.mode === "live" && p.paidAt !== null && now - p.paidAt.getTime() > 3 * 86_400_000;
    return {
      paid: p.paidAt ? p.paidAt.toISOString().slice(0, 10) : "",
      resort: names.get(p.propertyId)?.code ?? "",
      booking: number,
      payment: p.paymentId,
      amount: p.amountPaise,
      fee: p.feePaise,
      feeTax: p.feeTaxPaise,
      settles: p.feePaise === null ? null : p.amountPaise - p.feePaise - (p.feeTaxPaise ?? 0),
      settlement: p.settlementId ?? (p.mode === "test" ? "Test mode" : late ? "Not settled after 3 days" : "Waiting"),
      settledOn: p.settledAt ? p.settledAt.toISOString().slice(0, 10) : "",
      late: late ? 1 : 0,
    };
  });
  return {
    title: "Settlement reconciliation",
    description: "Online payments against Razorpay's settlements, with Razorpay's fee and the GST on it. A live payment still unsettled after 3 days is flagged. The morning job pulls yesterday's settlements.",
    columns: [
      { key: "paid", label: "Paid on", kind: "date" },
      ...(propertyIds.length > 1 ? [{ key: "resort", label: "Resort" }] : []),
      { key: "booking", label: "Booking" },
      { key: "payment", label: "Payment id" },
      { key: "amount", label: "Amount", kind: "money" as const },
      { key: "fee", label: "Fee", kind: "money" as const },
      { key: "feeTax", label: "GST on fee", kind: "money" as const },
      { key: "settles", label: "Settles", kind: "money" as const },
      { key: "settlement", label: "Settlement" },
      { key: "settledOn", label: "Settled on", kind: "date" as const },
    ],
    rows: list,
    total: { paid: "Total", amount: sum(list, "amount"), fee: sum(list, "fee"), feeTax: sum(list, "feeTax"), settles: sum(list, "settles") },
    flagged: (row) => row.late === 1,
  };
}

/** Occupancy %, average daily rate (ADR) and revenue per available room (RevPAR), by resort and room type (URD 7.4). */
export async function occupancyTable(propertyIds: string[], period: Period): Promise<ReportTable> {
  const db = getDb();
  const names = await resortNames(propertyIds);
  const nights = Math.round((Date.parse(period.to) - Date.parse(period.from)) / 86_400_000) + 1;
  const types = await db
    .select({ id: roomTypes.id, propertyId: roomTypes.propertyId, name: roomTypes.name, units: sql<number>`count(${units.id}) filter (where ${units.status} = 'active')`.mapWith(Number) })
    .from(roomTypes)
    .leftJoin(units, eq(units.roomTypeId, roomTypes.id))
    .where(and(inArray(roomTypes.propertyId, propertyIds), eq(roomTypes.status, "active")))
    .groupBy(roomTypes.id)
    .orderBy(asc(roomTypes.propertyId), asc(roomTypes.sortOrder));
  const booked = await db
    .select({ roomTypeId: units.roomTypeId, nights: sql<number>`count(*)`.mapWith(Number) })
    .from(unitNights)
    .innerJoin(units, eq(units.id, unitNights.unitId))
    .where(and(inArray(unitNights.propertyId, propertyIds), isNotNull(unitNights.bookingId), gte(unitNights.night, period.from), lte(unitNights.night, period.to)))
    .groupBy(units.roomTypeId);
  const overlap = sql`(least(${bookings.checkOut}, ${period.to}::date + 1) - greatest(${bookings.checkIn}, ${period.from}::date))`;
  const earned = await db
    .select({ roomTypeId: bookingItems.roomTypeId, paise: sql<number>`coalesce(sum(${bookingItems.amountPaise}::numeric * ${overlap} / nullif(${bookings.checkOut} - ${bookings.checkIn}, 0)), 0)`.mapWith(Number) })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .where(and(inArray(bookingItems.propertyId, propertyIds), eq(bookingItems.kind, "stay"), inArray(bookings.status, sold), lte(bookings.checkIn, period.to), sql`${bookings.checkOut} > ${period.from}::date`, isNotNull(bookingItems.amountPaise)))
    .groupBy(bookingItems.roomTypeId);
  const rows: Row[] = types.map((t) => {
    const soldNights = booked.find((b) => b.roomTypeId === t.id)?.nights ?? 0;
    const paise = Math.round(earned.find((e) => e.roomTypeId === t.id)?.paise ?? 0);
    const available = t.units * nights;
    return {
      resort: names.get(t.propertyId)?.code ?? "",
      label: t.name,
      available,
      sold: soldNights,
      occupancy: available ? soldNights / available : 0,
      revenue: paise,
      adr: soldNights ? wholeRupee(paise / soldNights) : 0,
      revpar: available ? wholeRupee(paise / available) : 0,
    };
  });
  const available = sum(rows, "available");
  const soldNights = sum(rows, "sold");
  const revenue = sum(rows, "revenue");
  return {
    title: "Occupancy, ADR and RevPAR",
    description: `Room nights for sale (rooms in use × ${nights} nights) against nights booked, and room revenue before GST. ADR is revenue per room night sold; RevPAR is revenue per room night for sale.`,
    columns: [
      ...(propertyIds.length > 1 ? [{ key: "resort", label: "Resort" }] : []),
      { key: "label", label: "Room type" },
      { key: "available", label: "Nights for sale", kind: "number" as const },
      { key: "sold", label: "Nights sold", kind: "number" as const },
      { key: "occupancy", label: "Occupancy", kind: "percent" as const },
      { key: "revenue", label: "Room revenue", kind: "money" as const },
      { key: "adr", label: "ADR", kind: "money" as const },
      { key: "revpar", label: "RevPAR", kind: "money" as const },
    ],
    rows,
    total: { label: propertyIds.length > 1 ? "Group total" : "All rooms", available, sold: soldNights, occupancy: available ? soldNights / available : 0, revenue, adr: soldNights ? wholeRupee(revenue / soldNights) : 0, revpar: available ? wholeRupee(revenue / available) : 0 },
  };
}

/** Sales per package, stay and day, and day-package guests per date (URD 7.4: packages). */
export async function packagesTable(propertyIds: string[], period: Period): Promise<ReportTable> {
  const db = getDb();
  const names = await resortNames(propertyIds);
  const stay = await db
    .select({ propertyId: bookingItems.propertyId, name: stayPackages.name, party: bookingItems.party, paise: bookingItems.amountPaise, day: bookings.checkIn })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .innerJoin(stayPackages, eq(stayPackages.id, bookingItems.packageId))
    .where(and(inArray(bookingItems.propertyId, propertyIds), inArray(bookings.status, sold), gte(bookings.checkIn, period.from), lte(bookings.checkIn, period.to)));
  const day = await db
    .select({ propertyId: bookingItems.propertyId, name: offerings.name, party: bookingItems.party, paise: bookingItems.amountPaise, day: bookings.visitDate })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .innerJoin(offerings, eq(offerings.id, bookingItems.offeringId))
    .where(and(inArray(bookingItems.propertyId, propertyIds), eq(bookingItems.kind, "offering"), inArray(bookings.status, sold), gte(bookings.visitDate, period.from), lte(bookings.visitDate, period.to)));
  const by = new Map<string, Row>();
  for (const [kind, list] of [
    ["Stay package", stay],
    ["Day package", day],
  ] as const) {
    for (const item of list) {
      const key = `${item.propertyId}|${kind}|${item.name}`;
      const row = by.get(key) ?? { resort: names.get(item.propertyId)?.code ?? "", kind, label: item.name, sold: 0, guests: 0, revenue: 0, days: "" };
      row.sold = (row.sold as number) + 1;
      row.guests = (row.guests as number) + headcount(item.party);
      row.revenue = (row.revenue as number) + (item.paise ?? 0);
      by.set(key, row);
    }
  }
  // Guests on each date for day packages, as "12 Dec: 40, 13 Dec: 25".
  for (const row of by.values()) {
    if (row.kind !== "Day package") continue;
    const perDay = new Map<string, number>();
    for (const item of day.filter((d) => d.name === row.label && names.get(d.propertyId)?.code === row.resort)) perDay.set(item.day ?? "", (perDay.get(item.day ?? "") ?? 0) + headcount(item.party));
    row.days = [...perDay].sort().map(([d, n]) => `${new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}: ${n}`).join(", ");
  }
  const rows = [...by.values()].sort((a, b) => (b.revenue as number) - (a.revenue as number));
  return {
    title: "Packages",
    description: "Stay packages by arrival and day packages by visit day in the period, with guests and revenue before GST. Day packages list their guests on each date.",
    columns: [
      ...(propertyIds.length > 1 ? [{ key: "resort", label: "Resort" }] : []),
      { key: "kind", label: "Kind" },
      { key: "label", label: "Package" },
      { key: "sold", label: "Sold", kind: "number" as const },
      { key: "guests", label: "Guests", kind: "number" as const },
      { key: "revenue", label: "Revenue", kind: "money" as const },
      { key: "days", label: "Guests by date" },
    ],
    rows,
    total: { label: "Total", sold: sum(rows, "sold"), guests: sum(rows, "guests"), revenue: sum(rows, "revenue") },
  };
}

/** Uses, bookings and discount per offer and coupon, by the day the booking was made (OFR-05). */
export async function offersTable(propertyIds: string[], period: Period): Promise<ReportTable> {
  const names = await resortNames(propertyIds);
  const rows = await getDb()
    .select({
      propertyId: offerUses.propertyId,
      title: offers.title,
      code: offers.code,
      bookings: sql<number>`count(*)`.mapWith(Number),
      discount: sql<number>`coalesce(sum(${offerUses.discountPaise}), 0)`.mapWith(Number),
      revenue: sql<number>`coalesce(sum(${bookings.totalPaise}), 0)`.mapWith(Number),
      daily: sql<number>`count(*) filter (where ${offerUses.offerDay} is not null)`.mapWith(Number),
    })
    .from(offerUses)
    .innerJoin(offers, eq(offers.id, offerUses.offerId))
    .innerJoin(bookings, eq(bookings.id, offerUses.bookingId))
    .where(and(inArray(offerUses.propertyId, propertyIds), ne(bookings.status, "expired"), sql`${indiaDay(offerUses.createdAt)} between ${period.from} and ${period.to}`))
    .groupBy(offerUses.propertyId, offers.title, offers.code)
    .orderBy(sql`count(*) desc`);
  const list: Row[] = rows.map((r) => ({ resort: names.get(r.propertyId)?.code ?? "", label: r.title, code: r.code, bookings: r.bookings, daily: r.daily, discount: r.discount, revenue: r.revenue }));
  return {
    title: "Offers and coupons",
    description: "Each offer and coupon used in the period: bookings, how many as the Offer of the Day, the discount given before GST, and the bookings' value with GST. Bookings that expired unpaid don't count.",
    columns: [
      ...(propertyIds.length > 1 ? [{ key: "resort", label: "Resort" }] : []),
      { key: "label", label: "Offer" },
      { key: "code", label: "Code" },
      { key: "bookings", label: "Bookings", kind: "number" as const },
      { key: "daily", label: "As Offer of the Day", kind: "number" as const },
      { key: "discount", label: "Discount", kind: "money" as const },
      { key: "revenue", label: "Booking value", kind: "money" as const },
    ],
    rows: list,
    total: { label: "Total", bookings: sum(list, "bookings"), daily: sum(list, "daily"), discount: sum(list, "discount"), revenue: sum(list, "revenue") },
  };
}

/** Bookings cancelled in the period, with what was refunded and why (URD 7.4: cancellations and refunds). */
export async function refundsTable(propertyIds: string[], period: Period): Promise<ReportTable> {
  const db = getDb();
  const names = await resortNames(propertyIds);
  const cancelled = await db
    .select({ at: bookingEvents.at, note: bookingEvents.note, booking: bookings, guest: guests.name })
    .from(bookingEvents)
    .innerJoin(bookings, eq(bookings.id, bookingEvents.bookingId))
    .innerJoin(guests, eq(guests.id, bookings.guestId))
    .where(and(inArray(bookingEvents.propertyId, propertyIds), eq(bookingEvents.toStatus, "cancelled"), sql`${indiaDay(bookingEvents.at)} between ${period.from} and ${period.to}`))
    .orderBy(asc(bookingEvents.at));
  const backs = cancelled.length
    ? await db
        .select({ bookingId: refunds.bookingId, paise: sql<number>`coalesce(sum(${refunds.amountPaise}) filter (where ${refunds.status} = 'processed'), 0)`.mapWith(Number), pending: sql<number>`coalesce(sum(${refunds.amountPaise}) filter (where ${refunds.status} in ('requested','processing')), 0)`.mapWith(Number), reasons: sql<string>`string_agg(distinct ${refunds.reason}, '; ')` })
        .from(refunds)
        .where(inArray(refunds.bookingId, cancelled.map((c) => c.booking.id)))
        .groupBy(refunds.bookingId)
    : [];
  const rows: Row[] = cancelled.map((c) => {
    const back = backs.find((b) => b.bookingId === c.booking.id);
    return {
      on: c.at.toISOString().slice(0, 10),
      resort: names.get(c.booking.propertyId)?.code ?? "",
      booking: c.booking.number,
      guest: c.guest,
      value: c.booking.totalPaise,
      paid: c.booking.paidPaise,
      refunded: back?.paise ?? 0,
      pending: back?.pending ?? 0,
      reason: [c.note, back?.reasons].filter(Boolean).join("; "),
    };
  });
  return {
    title: "Cancellations and refunds",
    description: "Bookings cancelled in the period: their value, what was paid, what went back and what is still waiting, with the reasons given.",
    columns: [
      { key: "on", label: "Cancelled on", kind: "date" },
      ...(propertyIds.length > 1 ? [{ key: "resort", label: "Resort" }] : []),
      { key: "booking", label: "Booking" },
      { key: "guest", label: "Guest" },
      { key: "value", label: "Value", kind: "money" as const },
      { key: "paid", label: "Paid", kind: "money" as const },
      { key: "refunded", label: "Refunded", kind: "money" as const },
      { key: "pending", label: "Refund waiting", kind: "money" as const },
      { key: "reason", label: "Reason" },
    ],
    rows,
    total: { on: "Total", value: sum(rows, "value"), paid: sum(rows, "paid"), refunded: sum(rows, "refunded"), pending: sum(rows, "pending") },
  };
}

/** Bookings by where they came from, with the UTM source, medium and campaign captured at booking (URD 7.4). */
export async function sourcesTable(propertyIds: string[], period: Period): Promise<ReportTable> {
  const names = await resortNames(propertyIds);
  const rows = await getDb()
    .select({
      propertyId: bookings.propertyId,
      source: bookings.source,
      utmSource: sql<string>`coalesce(${bookings.campaign}->>'utm_source', case when ${bookings.campaign}->>'gclid' is not null then 'google (click id)' when ${bookings.campaign}->>'fbclid' is not null then 'meta (click id)' when ${bookings.campaign}->>'referrer' is not null then 'referral' end, '')`,
      utmMedium: sql<string>`coalesce(${bookings.campaign}->>'utm_medium', '')`,
      utmCampaign: sql<string>`coalesce(${bookings.campaign}->>'utm_campaign', '')`,
      bookings: sql<number>`count(*)`.mapWith(Number),
      revenue: sql<number>`coalesce(sum(${bookings.totalPaise}), 0)`.mapWith(Number),
    })
    .from(bookings)
    .where(and(inArray(bookings.propertyId, propertyIds), inArray(bookings.status, sold), sql`${bookedOn} between ${period.from} and ${period.to}`))
    .groupBy(bookings.propertyId, bookings.source, sql`2`, sql`3`, sql`4`, sql`5`)
    .orderBy(sql`7 desc`);
  const list: Row[] = rows.map((r) => ({
    resort: names.get(r.propertyId)?.code ?? "",
    label: sourceLabel[r.source] ?? r.source,
    utmSource: r.utmSource || (r.source === "website" ? "direct" : ""),
    utmMedium: r.utmMedium,
    utmCampaign: r.utmCampaign,
    bookings: r.bookings,
    revenue: r.revenue,
  }));
  return {
    title: "Booking sources",
    description: "Paid bookings made in the period by where they came from: the website (with the campaign that brought the guest) or the desk, phone and agents. This shows which ads bring bookings.",
    columns: [
      ...(propertyIds.length > 1 ? [{ key: "resort", label: "Resort" }] : []),
      { key: "label", label: "Source" },
      { key: "utmSource", label: "UTM source" },
      { key: "utmMedium", label: "Medium" },
      { key: "utmCampaign", label: "Campaign" },
      { key: "bookings", label: "Bookings", kind: "number" as const },
      { key: "revenue", label: "Value", kind: "money" as const },
    ],
    rows: list,
    total: { label: "Total", bookings: sum(list, "bookings"), revenue: sum(list, "revenue") },
  };
}

/** Leads in the period by source, kind and status, with conversion and value won, and each sales person's figures (URD 7.4: CRM). */
export async function leadsTables(propertyIds: string[], period: Period): Promise<ReportTable[]> {
  const db = getDb();
  const leadOn = indiaDay(leads.createdAt);
  const where = and(inArray(leads.propertyId, propertyIds), sql`${leadOn} between ${period.from} and ${period.to}`);
  const list = await db
    .select({ lead: leads, owner: user.name, wonPaise: bookings.totalPaise })
    .from(leads)
    .leftJoin(user, eq(user.id, leads.assignedTo))
    .leftJoin(bookings, eq(bookings.id, leads.bookingId))
    .where(where);
  const group = (keyOf: (l: (typeof list)[number]) => string) => {
    const by = new Map<string, Row>();
    for (const item of list) {
      const key = keyOf(item);
      const row = by.get(key) ?? { label: key, leads: 0, open: 0, won: 0, lost: 0, conversion: 0, value: 0, pipeline: 0 };
      row.leads = (row.leads as number) + 1;
      if (item.lead.status === "won") {
        row.won = (row.won as number) + 1;
        row.value = (row.value as number) + (item.wonPaise ?? 0);
      } else if (item.lead.status === "lost") row.lost = (row.lost as number) + 1;
      else {
        row.open = (row.open as number) + 1;
        row.pipeline = (row.pipeline as number) + (item.lead.estimatedValuePaise ?? 0);
      }
      by.set(key, row);
    }
    const rows: Row[] = [...by.values()].map((r) => ({ ...r, conversion: (r.leads as number) ? (r.won as number) / (r.leads as number) : 0 }));
    rows.sort((a, b) => (b.leads as number) - (a.leads as number));
    const all = totals(rows, "Total", ["leads", "open", "won", "lost", "value", "pipeline"]);
    all.conversion = (all.leads as number) ? (all.won as number) / (all.leads as number) : 0;
    return { rows, total: all };
  };
  const columns = (first: string): Column[] => [
    { key: "label", label: first },
    { key: "leads", label: "Leads", kind: "number" },
    { key: "open", label: "Open", kind: "number" },
    { key: "won", label: "Booked", kind: "number" },
    { key: "lost", label: "Lost", kind: "number" },
    { key: "conversion", label: "Conversion", kind: "percent" },
    { key: "value", label: "Value won", kind: "money" },
    { key: "pipeline", label: "Open estimate", kind: "money" },
  ];
  const bySource = group((l) => leadSourceLabel[l.lead.source]);
  const byKind = group((l) => leadInterestLabel[l.lead.interest]);
  const byPerson = group((l) => l.owner ?? "No one yet");
  const statusRows: Row[] = Object.entries(leadStatusLabel).map(([key, label]) => ({ label, leads: list.filter((l) => l.lead.status === key).length }));
  return [
    { title: "Leads by source", description: "Leads that came in the period, by how they came, with where they stand now.", columns: columns("Source"), ...bySource },
    { title: "Leads by kind", description: "What the leads wanted.", columns: columns("Kind"), ...byKind },
    { title: "Sales team", description: "Each person's leads that came in the period: booked, lost, conversion and the value won.", columns: columns("Worked by"), ...byPerson },
    { title: "Leads by stage", description: "Where the period's leads stand now.", columns: [{ key: "label", label: "Stage" }, { key: "leads", label: "Leads", kind: "number" }], rows: statusRows, total: { label: "Total", leads: list.length } },
  ];
}

/**
 * GST invoices and credit notes per company per month, with taxable value,
 * CGST, SGST and IGST, and the list itself, for the accountant's GST
 * filing (URD 7.4: GST).
 */
export async function gstTables(propertyIds: string[], period: Period): Promise<ReportTable[]> {
  const names = await resortNames(propertyIds);
  const rows = await getDb()
    .select({ invoice: invoices })
    .from(invoices)
    .where(and(inArray(invoices.propertyId, propertyIds), gte(invoices.issuedOn, period.from), lte(invoices.issuedOn, period.to)))
    .orderBy(asc(invoices.issuedOn), asc(invoices.number));
  const sign = (kind: string) => (kind === "credit_note" ? -1 : 1);
  // No minus zero: a credit note with no IGST shows ₹0.
  const signed = (kind: string, paise: number) => (paise === 0 ? 0 : sign(kind) * paise);
  const by = new Map<string, Row>();
  for (const { invoice } of rows) {
    const month = invoice.issuedOn.slice(0, 7);
    const key = `${invoice.propertyId}|${month}`;
    const monthName = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
    const row = by.get(key) ?? { resort: names.get(invoice.propertyId)?.name ?? "", label: monthName, invoices: 0, creditNotes: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
    if (invoice.kind === "credit_note") row.creditNotes = (row.creditNotes as number) + 1;
    else row.invoices = (row.invoices as number) + 1;
    row.taxable = (row.taxable as number) + signed(invoice.kind, invoice.taxablePaise);
    row.cgst = (row.cgst as number) + signed(invoice.kind, invoice.cgstPaise);
    row.sgst = (row.sgst as number) + signed(invoice.kind, invoice.sgstPaise);
    row.igst = (row.igst as number) + signed(invoice.kind, invoice.igstPaise);
    row.total = (row.total as number) + signed(invoice.kind, invoice.totalPaise);
    by.set(key, row);
  }
  const monthly = [...by.values()];
  const list: Row[] = rows.map(({ invoice }) => ({
    on: invoice.issuedOn,
    resort: names.get(invoice.propertyId)?.code ?? "",
    number: invoice.number,
    kind: invoice.kind === "credit_note" ? "Credit note" : "Invoice",
    buyer: invoice.buyer.name,
    buyerGstin: invoice.buyer.gstin ?? "",
    taxable: signed(invoice.kind, invoice.taxablePaise),
    cgst: signed(invoice.kind, invoice.cgstPaise),
    sgst: signed(invoice.kind, invoice.sgstPaise),
    igst: signed(invoice.kind, invoice.igstPaise),
    total: signed(invoice.kind, invoice.totalPaise),
  }));
  const keys = ["taxable", "cgst", "sgst", "igst", "total"];
  return [
    {
      title: "GST by month",
      description: "Invoices less credit notes, per company per month. Credit notes count as minus amounts. Give this and the list below to the accountant for GST filing.",
      columns: [
        { key: "resort", label: "Company" },
        { key: "label", label: "Month" },
        { key: "invoices", label: "Invoices", kind: "number" },
        { key: "creditNotes", label: "Credit notes", kind: "number" },
        { key: "taxable", label: "Taxable value", kind: "money" },
        { key: "cgst", label: "CGST", kind: "money" },
        { key: "sgst", label: "SGST", kind: "money" },
        { key: "igst", label: "IGST", kind: "money" },
        { key: "total", label: "Total", kind: "money" },
      ],
      rows: monthly,
      total: monthly.length > 1 ? { ...totals(monthly, "", ["invoices", "creditNotes", ...keys], "resort"), resort: "Total" } : undefined,
    },
    {
      title: "Invoices and credit notes",
      description: "Each GST invoice and credit note issued in the period, with the buyer's GSTIN for business invoices (B2B).",
      columns: [
        { key: "on", label: "Date", kind: "date" },
        ...(propertyIds.length > 1 ? [{ key: "resort", label: "Company" }] : []),
        { key: "number", label: "Number" },
        { key: "kind", label: "Kind" },
        { key: "buyer", label: "Buyer" },
        { key: "buyerGstin", label: "Buyer GSTIN" },
        { key: "taxable", label: "Taxable", kind: "money" as const },
        { key: "cgst", label: "CGST", kind: "money" as const },
        { key: "sgst", label: "SGST", kind: "money" as const },
        { key: "igst", label: "IGST", kind: "money" as const },
        { key: "total", label: "Total", kind: "money" as const },
      ],
      rows: list,
      total: { on: "Total", ...Object.fromEntries(keys.map((k) => [k, sum(list, k)])) },
    },
  ];
}

/** The day's arrivals, departures and guests in house, for the front desk (URD 7.4). */
export async function frontDeskTable(propertyIds: string[], day: string): Promise<ReportTable> {
  const names = await resortNames(propertyIds);
  const rows = await getDb()
    .select({ booking: bookings, guest: guests.name, phone: guests.phone })
    .from(bookings)
    .innerJoin(guests, eq(guests.id, bookings.guestId))
    .where(
      and(
        inArray(bookings.propertyId, propertyIds),
        inArray(bookings.status, ["part_paid", "confirmed", "checked_in", "checked_out", "pending_payment"]),
        or(eq(bookings.checkIn, day), eq(bookings.checkOut, day), and(lte(bookings.checkIn, day), sql`${bookings.checkOut} > ${day}::date`), eq(bookings.visitDate, day)),
      ),
    )
    .orderBy(asc(bookings.checkIn), desc(bookings.createdAt));
  const list: Row[] = rows.map(({ booking, guest, phone }) => ({
    list: booking.visitDate === day ? "Day visit" : booking.checkIn === day ? "Arriving" : booking.checkOut === day ? "Leaving" : "In house",
    resort: names.get(booking.propertyId)?.code ?? "",
    booking: booking.number,
    guest,
    phone: phone ? `+${phone}` : "",
    status: statusLabel[booking.status],
    checkIn: booking.checkIn ?? booking.visitDate ?? "",
    checkOut: booking.checkOut ?? "",
    due: booking.totalPaise === null ? null : Math.max(0, booking.totalPaise - booking.paidPaise),
  }));
  const order = ["Arriving", "Day visit", "In house", "Leaving"];
  list.sort((a, b) => order.indexOf(a.list as string) - order.indexOf(b.list as string));
  return {
    title: "Arrivals, departures and in house",
    description: `The front desk's lists for ${new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}, with the balance still to collect.`,
    columns: [
      { key: "list", label: "List" },
      ...(propertyIds.length > 1 ? [{ key: "resort", label: "Resort" }] : []),
      { key: "booking", label: "Booking" },
      { key: "guest", label: "Guest" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status" },
      { key: "checkIn", label: "Check-in", kind: "date" as const },
      { key: "checkOut", label: "Check-out", kind: "date" as const },
      { key: "due", label: "To collect", kind: "money" as const },
    ],
    rows: list,
    total: { list: "Total to collect", due: sum(list, "due") },
  };
}

/** The reports on offer, in order, and who may see each (RPT-03). */
export const reportKinds = [
  { key: "sales", label: "Sales", needs: "reports.view" },
  { key: "payments", label: "Payments", needs: "reports.view" },
  { key: "settlements", label: "Settlements", needs: "reports.view" },
  { key: "occupancy", label: "Occupancy", needs: "reports.view" },
  { key: "frontdesk", label: "Front desk", needs: "reports.daily" },
  { key: "packages", label: "Packages", needs: "reports.view" },
  { key: "offers", label: "Offers", needs: "reports.view" },
  { key: "refunds", label: "Cancellations", needs: "reports.view" },
  { key: "sources", label: "Sources", needs: "reports.view" },
  { key: "leads", label: "Leads", needs: "reports.leads" },
  { key: "gst", label: "GST", needs: "reports.view" },
] as const;
export type ReportKind = (typeof reportKinds)[number]["key"];

/** The tables of one report, for a page or an export. */
export async function buildReport(kind: ReportKind, propertyIds: string[], period: Period): Promise<ReportTable[]> {
  switch (kind) {
    case "sales":
      return [await salesTable(propertyIds, period, "booked"), await salesTable(propertyIds, period, "stay")];
    case "payments":
      return [await paymentsTable(propertyIds, period)];
    case "settlements":
      return [await settlementsTable(propertyIds, period)];
    case "occupancy":
      return [await occupancyTable(propertyIds, period)];
    case "frontdesk":
      return [await frontDeskTable(propertyIds, period.to)];
    case "packages":
      return [await packagesTable(propertyIds, period)];
    case "offers":
      return [await offersTable(propertyIds, period)];
    case "refunds":
      return [await refundsTable(propertyIds, period)];
    case "sources":
      return [await sourcesTable(propertyIds, period)];
    case "leads":
      return leadsTables(propertyIds, period);
    case "gst":
      return gstTables(propertyIds, period);
  }
}

/** A cell as a spreadsheet wants it: rupees as numbers, shares as percentages. */
export function exportCell(column: Column, value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (column.kind === "money" && typeof value === "number") return Math.round(value) / 100;
  if (column.kind === "percent" && typeof value === "number") return Math.round(value * 1000) / 10;
  return value;
}

export const exportLabel = (column: Column) => (column.kind === "money" ? `${column.label} (₹)` : column.kind === "percent" ? `${column.label} (%)` : column.label);

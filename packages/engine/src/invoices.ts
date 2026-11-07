import { and, desc, eq, sql } from "drizzle-orm";
import { bookings, guests, invoiceCounters, invoices, properties, type InvoiceLineJson, type InvoicePartyJson } from "@repo/db";
import type { Tx } from "./bookings";
import { todayInIndia } from "./dates";
import type { Quote } from "./holds";
import { loadTaxRules, taxQuote } from "./tax";

/*
 * GST invoices and credit notes (PR-07; docs/implementation-plan.md,
 * section 5: invoice numbers). The transaction that confirms a booking, or
 * records its first payment, issues its invoice, so the series has no gaps.
 * A price change credits the old invoice in full and issues a new one; a
 * refund credits part of it. An invoice is never edited or deleted.
 */

/** The financial year a day falls in, April to March: "2026-27". */
export function financialYear(day: string) {
  const year = Number(day.slice(0, 4));
  const start = Number(day.slice(5, 7)) >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** KS/2627/000001 for invoices and KS/CN/2627/00001 for credit notes: at most 16 characters, as GST allows. */
async function nextNumber(tx: Tx, propertyId: string, code: string, fy: string, kind: "invoice" | "credit_note") {
  const [row] = await tx
    .insert(invoiceCounters)
    .values({ propertyId, financialYear: fy, kind, next: 2 })
    .onConflictDoUpdate({ target: [invoiceCounters.propertyId, invoiceCounters.financialYear, invoiceCounters.kind], set: { next: sql`${invoiceCounters.next} + 1` } })
    .returning({ next: invoiceCounters.next });
  const years = `${fy.slice(2, 4)}${fy.slice(5, 7)}`;
  const n = row.next - 1;
  return kind === "invoice" ? `${code}/${years}/${String(n).padStart(6, "0")}` : `${code}/CN/${years}/${String(n).padStart(5, "0")}`;
}

const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Spreads a whole number over weights, adding up exactly. */
function apportion(total: number, weights: number[]) {
  const whole = weights.reduce((sum, w) => sum + w, 0);
  if (whole === 0) return weights.map((_, i) => (i === 0 ? total : 0));
  const out = weights.map((w) => Math.floor((total * w) / whole));
  let left = total - out.reduce((sum, a) => sum + a, 0);
  const order = weights.map((_, i) => i).sort((a, b) => weights[b] - weights[a]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k]] += 1;
  return out;
}

/**
 * A booking's invoice lines: each quote line at each GST rate, with the
 * booking's own price before GST spread over them. Null while the price or
 * a GST rule is missing.
 */
async function invoiceLines(tx: Tx, booking: typeof bookings.$inferSelect): Promise<InvoiceLineJson[] | null> {
  if (booking.subtotalPaise === null || booking.taxPaise === null) return null;
  const quote = booking.quote as Quote;
  const taxed = taxQuote(quote, await loadTaxRules(tx, booking.propertyId), booking.subtotalPaise);
  if (!taxed) return null;

  const groups = new Map<string, InvoiceLineJson>();
  for (const item of taxed.items) {
    const line = quote.lines[item.line];
    const key = `${item.line}|${item.rateBps}|${item.sac ?? ""}`;
    let group = groups.get(key);
    if (!group) {
      let description = "";
      let unit = "night";
      if (line.kind === "stay") description = `${line.roomTypeName}, ${shortDay(quote.checkIn!)} to ${shortDay(quote.checkOut!)}`;
      else if (line.kind === "offering") {
        description = `${line.offeringName}, ${line.slotLabel}, ${shortDay(line.day)}`;
        unit = "guest";
      }
      group = { description, sac: item.sac, quantity: 0, unit, taxablePaise: 0, rateBps: item.rateBps, taxPaise: 0 };
      groups.set(key, group);
    }
    group.quantity += line.kind === "stay" ? 1 : item.units;
    group.taxablePaise += item.amountPaise;
  }
  const lines = [...groups.values()];
  // Each rate's GST, as the booking worked it out, shared over that rate's lines.
  for (const part of taxed.parts) {
    const own = lines.filter((l) => l.rateBps === part.rateBps && l.sac === part.sac);
    apportion(part.taxPaise, own.map((l) => l.taxablePaise)).forEach((tax, i) => (own[i].taxPaise = tax));
  }
  return lines;
}

async function parties(tx: Tx, booking: typeof bookings.$inferSelect): Promise<{ code: string; seller: InvoicePartyJson; buyer: InvoicePartyJson }> {
  const [property] = await tx.select().from(properties).where(eq(properties.id, booking.propertyId));
  const [guest] = await tx.select().from(guests).where(eq(guests.id, booking.guestId));
  const gstin = guest.companyGstin;
  return {
    code: property.code,
    seller: {
      name: property.legalName ?? property.name,
      gstin: property.gstin,
      address: property.address,
      phone: property.phone,
      email: property.email,
      stateCode: property.stateCode,
      stateName: property.stateName,
    },
    buyer: {
      name: guest.companyName ? `${guest.companyName} (${guest.name})` : guest.name,
      gstin,
      phone: guest.phone,
      email: guest.email,
      stateCode: gstin ? gstin.slice(0, 2) : null,
    },
  };
}

const sum = (lines: InvoiceLineJson[], key: "taxablePaise" | "taxPaise") => lines.reduce((total, line) => total + line[key], 0);

/** A booking's newest invoice with the part of it not yet credited, or null. */
export async function openInvoice(tx: Tx, bookingId: string) {
  const [invoice] = await tx
    .select()
    .from(invoices)
    .where(and(eq(invoices.bookingId, bookingId), eq(invoices.kind, "invoice")))
    .orderBy(desc(invoices.createdAt))
    .limit(1);
  if (!invoice) return null;
  const [credited] = await tx
    .select({ paise: sql<number>`coalesce(sum(${invoices.totalPaise}), 0)`.mapWith(Number) })
    .from(invoices)
    .where(and(eq(invoices.invoiceId, invoice.id), eq(invoices.kind, "credit_note")));
  const openPaise = invoice.totalPaise - credited.paise;
  return openPaise > 0 ? { ...invoice, openPaise } : null;
}

/**
 * Credits all or part of an invoice. A part is shared over the invoice's
 * lines by their totals, and each line's share is split back into its price
 * and its GST at that line's rate.
 */
export async function creditInvoice(tx: Tx, input: { invoiceId: string; totalPaise?: number; reason: string; userId?: string; today?: string }) {
  const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, input.invoiceId)).for("update");
  const open = await openInvoice(tx, invoice.bookingId);
  if (!open || open.id !== invoice.id) return null;
  const amount = Math.min(input.totalPaise ?? open.openPaise, open.openPaise);
  if (amount <= 0) return null;

  const shares = apportion(amount, invoice.lines.map((l) => l.taxablePaise + l.taxPaise));
  const lines = invoice.lines.map((line, i): InvoiceLineJson => {
    const taxable = Math.round((shares[i] * 10_000) / (10_000 + line.rateBps));
    return { ...line, taxablePaise: taxable, taxPaise: shares[i] - taxable };
  }).filter((line) => line.taxablePaise + line.taxPaise > 0);
  const today = input.today ?? todayInIndia();
  const fy = financialYear(today);
  const code = invoice.number.split("/")[0];
  const tax = sum(lines, "taxPaise");
  const [note] = await tx
    .insert(invoices)
    .values({
      propertyId: invoice.propertyId,
      bookingId: invoice.bookingId,
      kind: "credit_note",
      number: await nextNumber(tx, invoice.propertyId, code, fy, "credit_note"),
      financialYear: fy,
      issuedOn: today,
      seller: invoice.seller,
      buyer: invoice.buyer,
      lines,
      taxablePaise: sum(lines, "taxablePaise"),
      cgstPaise: Math.floor(tax / 2),
      sgstPaise: tax - Math.floor(tax / 2),
      totalPaise: amount,
      invoiceId: invoice.id,
      reason: input.reason,
      createdBy: input.userId ?? null,
    })
    .returning({ id: invoices.id, number: invoices.number });
  return note;
}

/** Booking states that have an invoice: money has come in, or staff confirmed it. */
const invoiced = new Set(["confirmed", "part_paid", "checked_in", "checked_out"]);

/**
 * Makes sure a booking's invoice matches its price. A paid or confirmed
 * booking with a known price gets an invoice; if its price changed since,
 * the old invoice is credited in full and a new one issued. Does nothing
 * while the price or a GST rule is missing.
 */
export async function ensureInvoice(tx: Tx, bookingId: string, userId?: string, today = todayInIndia()) {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!booking || !invoiced.has(booking.status) || booking.totalPaise === null) return null;
  const open = await openInvoice(tx, bookingId);
  if (open && open.totalPaise === booking.totalPaise && open.openPaise === open.totalPaise) return open;
  const lines = await invoiceLines(tx, booking);
  if (!lines) return null;
  if (open) await creditInvoice(tx, { invoiceId: open.id, reason: "The booking's price changed.", userId, today });

  const { code, seller, buyer } = await parties(tx, booking);
  const fy = financialYear(today);
  const tax = sum(lines, "taxPaise");
  const [invoice] = await tx
    .insert(invoices)
    .values({
      propertyId: booking.propertyId,
      bookingId,
      kind: "invoice",
      number: await nextNumber(tx, booking.propertyId, code, fy, "invoice"),
      financialYear: fy,
      issuedOn: today,
      seller,
      buyer,
      lines,
      taxablePaise: sum(lines, "taxablePaise"),
      cgstPaise: Math.floor(tax / 2),
      sgstPaise: tax - Math.floor(tax / 2),
      totalPaise: sum(lines, "taxablePaise") + tax,
      createdBy: userId ?? null,
    })
    .returning();
  return invoice;
}

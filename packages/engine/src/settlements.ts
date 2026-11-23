import { and, eq, inArray } from "drizzle-orm";
import { onlinePayments, properties, type Database } from "@repo/db";
import { paymentAccount } from "./online";
import { razorpay, razorpaySender } from "./razorpay";

/*
 * Razorpay settlements (URD 6.6, settlement reconciliation report): for each
 * company's account, the payments Razorpay paid out on a day, with its fee
 * and the GST on the fee. The morning job pulls yesterday's; a resort's
 * payments then show their settlement, and the report flags paid payments
 * that haven't settled. Safe to run again: it only fills in what it finds.
 */
export async function syncSettlements(db: Database, day: string, options: { propertyId?: string } = {}) {
  const [y, m, d] = day.split("-").map(Number);
  const resorts = await db.select({ id: properties.id, code: properties.code }).from(properties).where(and(eq(properties.active, true), options.propertyId ? eq(properties.id, options.propertyId) : undefined));
  const result: { code: string; matched: number; error?: string }[] = [];
  const seenKeys = new Set<string>();
  for (const resort of resorts) {
    const account = await paymentAccount(db, resort.id);
    if (!account) continue;
    // Resorts on the shared test account would read the same settlements twice.
    if (seenKeys.has(account.keyId)) continue;
    seenKeys.add(account.keyId);
    try {
      const api = razorpay(razorpaySender(account));
      const items = [];
      for (let skip = 0; ; skip += 1000) {
        const page = await api.settlementRecon(y, m, d, skip);
        items.push(...page);
        if (page.length < 1000) break;
      }
      const payments = items.filter((item) => item.type === "payment" && item.entity_id);
      let matched = 0;
      if (payments.length) {
        const rows = await db.select({ id: onlinePayments.id, paymentId: onlinePayments.paymentId }).from(onlinePayments).where(inArray(onlinePayments.paymentId, payments.map((p) => p.entity_id)));
        for (const row of rows) {
          const item = payments.find((p) => p.entity_id === row.paymentId)!;
          await db
            .update(onlinePayments)
            .set({ feePaise: item.fee ?? null, feeTaxPaise: item.tax ?? null, settlementId: item.settlement_id, settledAt: item.settled_at ? new Date(item.settled_at * 1000) : null })
            .where(eq(onlinePayments.id, row.id));
          matched++;
        }
      }
      result.push({ code: resort.code, matched });
    } catch (error) {
      result.push({ code: resort.code, matched: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}

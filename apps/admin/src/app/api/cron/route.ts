import { getDb } from "@repo/db";
import { expireHolds, recheckOnlinePayments, sendQueuedEmails } from "@repo/engine";

export const maxDuration = 60;

/**
 * The batch job (docs/implementation-plan.md, section 12): ends holds that
 * ran out (unpaid website bookings become leads), rechecks payments and
 * refunds still waiting on Razorpay, and sends email left in the outbox.
 * Safe to run twice. Vercel Cron calls it with CRON_SECRET; on the Hobby
 * plan only once a day, so the sites also recheck and send as guests pay.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed." }, { status: 401 });
  const db = getDb();
  const expired = await expireHolds(db);
  const payments = await recheckOnlinePayments(db);
  const emails = await sendQueuedEmails(db, { limit: 200 });
  return Response.json({ expired, ...payments, emails });
}

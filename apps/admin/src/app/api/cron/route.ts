import { getDb } from "@repo/db";
import { expireHolds, recheckOnlinePayments } from "@repo/engine";

export const maxDuration = 60;

/**
 * The batch job (docs/implementation-plan.md, section 12): ends holds that
 * ran out (unpaid website bookings become leads), and rechecks payments and
 * refunds still waiting on Razorpay. Safe to run twice. Vercel Cron calls
 * it with CRON_SECRET; on the Hobby plan only once a day, so the website's
 * booking page also rechecks its own booking while the guest waits.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed." }, { status: 401 });
  const db = getDb();
  const expired = await expireHolds(db);
  const payments = await recheckOnlinePayments(db);
  return Response.json({ expired, ...payments });
}

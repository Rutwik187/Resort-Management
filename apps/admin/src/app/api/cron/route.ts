import { getDb } from "@repo/db";
import { addDays, dueFollowUps, expireHolds, queueFollowUpReminders, queueGuestJourney, queueLowRoomsAlerts, queueSalesSummaries, recheckOnlinePayments, sendQueuedEmails, syncSettlements, todayInIndia } from "@repo/engine";

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
  // Follow-ups due now or overdue: a reminder to the person on each, once a day (CRM-04).
  const reminders = await queueFollowUpReminders(db, await dueFollowUps(db));
  // Yesterday's Razorpay settlements, with fees and GST on fees (URD 6.6).
  const settlements = await syncSettlements(db, addDays(todayInIndia(), -1));
  // The day's sales summary, and the week's on Mondays and the month's on the 1st (RPT-01).
  const summaries = await queueSalesSummaries(db);
  // Before-arrival and thank-you emails, and the low-rooms alert to each team (URD 9.2, INV-10).
  const journey = await queueGuestJourney(db);
  const lowRooms = await queueLowRoomsAlerts(db);
  const emails = await sendQueuedEmails(db, { limit: 200 });
  return Response.json({ expired, ...payments, reminders, settlements, summaries, journey, lowRooms, emails });
}

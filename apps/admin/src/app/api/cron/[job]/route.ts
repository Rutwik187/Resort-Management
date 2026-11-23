import { getDb } from "@repo/db";
import {
  addDays,
  dueFollowUps,
  expireHolds,
  pruneRequestLimits,
  queueFollowUpReminders,
  queueGuestJourney,
  queueLowRoomsAlerts,
  queueSalesSummaries,
  recheckOnlinePayments,
  runJob,
  sendQueuedEmails,
  syncGoogleReviews,
  syncSettlements,
  todayInIndia,
} from "@repo/engine";
import { deleteExpiredIdProofs } from "@/lib/id-proofs";

export const maxDuration = 300;

/*
 * The background jobs (docs/implementation-plan.md, section 12), on Vercel
 * Pro's cron (apps/admin/vercel.json). Each is safe to run twice: it takes
 * its lock in job_runs, and catches up on whatever a missed run left.
 *   frequent  every 15 minutes in the day, hourly at night: end holds that
 *             ran out (unpaid website bookings become leads), recheck
 *             payments and refunds Razorpay hasn't answered, follow-up
 *             reminders, and send the outbox (PAY-09, BK-05, CRM-04)
 *   reviews   every 2 hours in the day: Google reviews (REV-01)
 *   morning   6 am: yesterday's Razorpay settlements, ID proofs past their
 *             retention, old rate-limit counts (URD 6.6, ADM-08)
 *   guests    10 am: before-arrival and thank-you emails, low rooms (URD 9.2, INV-10)
 *   summary   9 pm: the day's sales summary (RPT-01)
 *   periodic  8 am: the week's summary on Mondays, the month's on the 1st (RPT-01)
 * Vercel calls each with CRON_SECRET.
 */

type Job = (db: ReturnType<typeof getDb>) => Promise<Record<string, unknown>>;

const jobs: Record<string, { minutes: number; run: Job }> = {
  frequent: {
    minutes: 10,
    run: async (db) => {
      const expired = await expireHolds(db);
      const payments = await recheckOnlinePayments(db);
      const reminders = await queueFollowUpReminders(db, await dueFollowUps(db));
      const emails = await sendQueuedEmails(db, { limit: 200 });
      return { expired, ...payments, reminders, emails };
    },
  },
  reviews: { minutes: 10, run: async (db) => ({ reviews: await syncGoogleReviews(db) }) },
  morning: {
    minutes: 20,
    run: async (db) => {
      const settlements = await syncSettlements(db, addDays(todayInIndia(), -1));
      const idProofs = await deleteExpiredIdProofs(db);
      await pruneRequestLimits(db);
      return { settlements, idProofs };
    },
  },
  guests: {
    minutes: 10,
    run: async (db) => {
      const journey = await queueGuestJourney(db);
      const lowRooms = await queueLowRoomsAlerts(db);
      const emails = await sendQueuedEmails(db, { limit: 500 });
      return { journey, lowRooms, emails };
    },
  },
  summary: {
    minutes: 10,
    run: async (db) => {
      const summaries = await queueSalesSummaries(db, todayInIndia(), { daily: true });
      return { summaries, emails: await sendQueuedEmails(db, { limit: 200 }) };
    },
  },
  periodic: {
    minutes: 10,
    run: async (db) => {
      const summaries = await queueSalesSummaries(db, todayInIndia(), { periodic: true });
      return { summaries, emails: await sendQueuedEmails(db, { limit: 200 }) };
    },
  },
};

export async function GET(request: Request, { params }: RouteContext<"/api/cron/[job]">) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed." }, { status: 401 });
  const name = (await params).job;
  const job = jobs[name];
  if (!job) return Response.json({ error: "No such job." }, { status: 404 });
  const db = getDb();
  const outcome = await runJob(db, name, job.minutes, () => job.run(db));
  return Response.json(outcome.skipped ? { job: name, skipped: "Another run holds the lock." } : { job: name, ...outcome.result });
}

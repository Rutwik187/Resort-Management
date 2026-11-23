import { eq, sql } from "drizzle-orm";
import { jobRuns, type Database } from "@repo/db";

/*
 * Runs a background job once at a time (plan section 12). Vercel Cron can
 * miss or double a call; the lock makes a second call at the same time
 * skip, and each job catches up on whatever it missed, so a missed call
 * costs nothing but time. The last result or error is kept for the admin.
 */
export async function runJob<T>(db: Database, name: string, minutes: number, job: () => Promise<T>): Promise<{ skipped: true } | { skipped: false; result: T }> {
  await db.insert(jobRuns).values({ name }).onConflictDoNothing();
  const [taken] = await db
    .update(jobRuns)
    .set({ lockedUntil: sql`now() + make_interval(mins => ${minutes})`, lastStartedAt: sql`now()` })
    .where(sql`${jobRuns.name} = ${name} and (${jobRuns.lockedUntil} is null or ${jobRuns.lockedUntil} < now())`)
    .returning({ name: jobRuns.name });
  if (!taken) return { skipped: true };
  try {
    const result = await job();
    await db.update(jobRuns).set({ lockedUntil: null, lastFinishedAt: sql`now()`, lastResult: result as unknown as object, lastError: null }).where(eq(jobRuns.name, name));
    return { skipped: false, result };
  } catch (error) {
    await db.update(jobRuns).set({ lockedUntil: null, lastFinishedAt: sql`now()`, lastError: error instanceof Error ? error.message : String(error) }).where(eq(jobRuns.name, name));
    throw error;
  }
}

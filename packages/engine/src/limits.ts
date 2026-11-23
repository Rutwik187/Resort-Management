import { lt, sql } from "drizzle-orm";
import { requestLimits, type Executor } from "@repo/db";

/*
 * Rate limits for the public forms and checkout (SEC-04): at most `limit`
 * requests per key in a window, counted in the database in one statement,
 * so two requests at once can't both slip past. A key is usually the kind
 * of request, the resort and the visitor's IP address.
 */

/** Counts one request; true while the key is within its limit for the window. */
export async function takeRequest(db: Executor, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await db.execute<{ count: number }>(sql`
    insert into ${requestLimits} (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when ${requestLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) then 1 else ${requestLimits.count} + 1 end,
      window_start = case when ${requestLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) then now() else ${requestLimits.windowStart} end
    returning count`);
  return Number(rows.rows[0]?.count ?? 0) <= limit;
}

/** Drops counts older than a day, for the daily job. */
export async function pruneRequestLimits(db: Executor) {
  await db.delete(requestLimits).where(lt(requestLimits.windowStart, sql`now() - interval '1 day'`));
}

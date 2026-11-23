import "server-only";
import { and, inArray, isNull, lt, sql } from "drizzle-orm";
import { del } from "@vercel/blob";
import { idProofs, type Database } from "@repo/db";
import { privateToken } from "./blob";

/**
 * Deletes guests' ID proofs past their resort's retention days (ADM-08),
 * from the private store and then from the list. Run by the morning job;
 * a failed delete is tried again the next morning.
 */
export async function deleteExpiredIdProofs(db: Database) {
  const token = privateToken();
  if (!token) return { deleted: 0, waiting: "BLOB_PRIVATE_READ_WRITE_TOKEN isn't set." };
  const due = await db
    .select({ id: idProofs.id, pathname: idProofs.pathname })
    .from(idProofs)
    .where(and(isNull(idProofs.deletedAt), lt(idProofs.deleteAfter, sql`now()`)))
    .limit(500);
  if (!due.length) return { deleted: 0 };
  await del(due.map((d) => d.pathname), { token });
  await db.update(idProofs).set({ deletedAt: sql`now()` }).where(inArray(idProofs.id, due.map((d) => d.id)));
  return { deleted: due.length };
}

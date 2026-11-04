import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "./client";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

/**
 * Applies every migration not yet applied. Run once per release, never from
 * a Vercel build. Kept out of the main entry: apps never import it, so their
 * bundlers don't try to bundle the migrations folder.
 */
export async function runMigrations(db: Database) {
  await migrate(db, { migrationsFolder });
}

import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "./client";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

/** Applies every migration not yet applied. Run once per release, never from a Vercel build. */
export async function runMigrations(db: Database) {
  await migrate(db, { migrationsFolder });
}

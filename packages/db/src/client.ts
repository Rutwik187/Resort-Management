import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

// Dates stay as yyyy-mm-dd text. node-postgres would otherwise make them
// JavaScript dates at local midnight, which can move a night by a day.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

/** Builds a Drizzle client on its own connection pool. */
export function createDb(connectionString: string, poolSize = 10) {
  const pool = new pg.Pool({ connectionString, max: poolSize });
  const db = drizzle({ client: pool, schema, casing: "snake_case" });
  return Object.assign(db, { pool });
}

export type Database = ReturnType<typeof createDb>;
/** A transaction, or the database itself: engine functions accept either. */
export type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

let shared: Database | undefined;

/**
 * The app's database, from DATABASE_URL (Neon's pooled address in
 * production). One pool per server instance, made on first use. On Vercel's
 * Fluid compute the pool is attached to the function, so idle connections
 * close before it suspends, as Neon recommends for node-postgres on Vercel.
 */
export function getDb(): Database {
  if (!shared) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
    shared = createDb(url);
    attachDatabasePool(shared.pool);
  }
  return shared;
}

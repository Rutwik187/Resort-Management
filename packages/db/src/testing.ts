import { randomBytes } from "node:crypto";
import pg from "pg";
import { createDb, type Database } from "./client";
import { runMigrations } from "./migrate";

/** Where tests may create and drop their own databases. A local Postgres by default. */
const adminUrl = () => process.env.TEST_DATABASE_ADMIN_URL ?? "postgresql://localhost:5432/postgres";

/**
 * A fresh database with every migration applied, for one test file. Each
 * gets its own name (prathamesh_test_…), so test files can run side by side.
 * Call drop() when done.
 */
export async function createTestDatabase(): Promise<{ db: Database; url: string; drop: () => Promise<void> }> {
  const name = `prathamesh_test_${randomBytes(4).toString("hex")}`;
  const admin = new pg.Client({ connectionString: adminUrl() });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();

  const url = new URL(adminUrl());
  url.pathname = `/${name}`;
  const db = createDb(url.toString(), 30);
  await runMigrations(db);

  return {
    db,
    url: url.toString(),
    drop: async () => {
      await db.pool.end();
      const cleanup = new pg.Client({ connectionString: adminUrl() });
      await cleanup.connect();
      await cleanup.query(`drop database if exists ${name} with (force)`);
      await cleanup.end();
    },
  };
}

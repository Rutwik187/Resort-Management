import { databaseUrl } from "./env";
import { createDb } from "../src";
import { runMigrations } from "../src/migrate";

const db = createDb(databaseUrl(), 1);
await runMigrations(db);
console.log("Migrations applied.");
await db.pool.end();

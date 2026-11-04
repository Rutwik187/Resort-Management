import { databaseUrl } from "./env";
import { createDb, runMigrations } from "../src";

const db = createDb(databaseUrl(), 1);
await runMigrations(db);
console.log("Migrations applied.");
await db.pool.end();

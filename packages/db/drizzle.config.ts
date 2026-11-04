import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./scripts/env";

// Migrations connect through the direct address, not the pooler (docs/implementation-plan.md, section 4).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  casing: "snake_case",
  dbCredentials: { url: databaseUrl() },
  strict: true,
  verbose: true,
});

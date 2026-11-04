import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Scripts read packages/db/.env.local when it exists (see .env.example).
const file = fileURLToPath(new URL("../.env.local", import.meta.url));
if (existsSync(file)) process.loadEnvFile(file);

/** The direct address for migrations, else the pooled one. */
export function databaseUrl() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL in packages/db/.env.local (see .env.example).");
  return url;
}

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// What the shell set, read before the file, so the shell wins. With
// DATABASE_URL=postgresql://localhost:5432/prathamesh_dev pnpm db:migrate, the
// file's direct address can't take the migration to Neon by mistake.
const fromShell = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

// The repo's one settings file: .env.local at the root (see .env.example).
const file = fileURLToPath(new URL("../../../.env.local", import.meta.url));
if (existsSync(file)) process.loadEnvFile(file);

/** The database a script works on: the shell's, else the direct address, else the pooled one. */
export function databaseUrl() {
  const url = fromShell || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL in .env.local at the repo root (see .env.example).");
  return url;
}

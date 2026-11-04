import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Database tests make a fresh Postgres database each, which takes a moment.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});

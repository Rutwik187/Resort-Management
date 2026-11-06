import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// The repo's one settings file is .env.local at the root (see .env.example). Next.js reads env
// files only in this app's folder, so load the root one here. Variables already set, in the
// shell or on Vercel, win over it. Keep no .env files in this folder: in development, a change
// to one makes Next reset its variables, which drops the root file's until a restart.
const rootEnv = resolve(process.cwd(), "../../.env.local");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

// The staff dashboard. Every page is per person and per resort, so nothing here is cached.
const nextConfig: NextConfig = {
  experimental: {
    // Vercel restores .next/cache from the last deployment. With Turbopack's build cache on,
    // a build on 4 Nov 2026 shipped the stylesheet of an older globals.css next to the new
    // pages, so the live admin lost its colours. A clean build of this app takes under a minute.
    turbopackFileSystemCacheForBuild: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

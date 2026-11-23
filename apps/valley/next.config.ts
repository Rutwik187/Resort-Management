import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// The repo's one settings file is .env.local at the root (see .env.example): this site reads
// DATABASE_URL and REVALIDATE_SECRET from it for its rooms, rates and packages. Variables
// already set, in the shell or on Vercel, win over it.
const rootEnv = resolve(process.cwd(), "../../.env.local");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

/**
 * Redirects staff add in the admin (SEO-04, SEO-07), read at build time and
 * made permanent. The admin rebuilds this site when they change. Without
 * the admin, the site builds with its own redirects only.
 */
async function adminRedirects() {
  const admin = (process.env.ADMIN_URL ?? "https://prathamesh-admin.vercel.app").replace(/\/$/, "");
  try {
    const response = await fetch(`${admin}/api/redirects/PV`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const rows = (await response.json()) as { source: string; destination: string }[];
    return rows
      .filter((r) => r.source.startsWith("/") && r.source !== "/" && (r.destination.startsWith("/") || r.destination.startsWith("https://")))
      .map((r) => ({ source: r.source, destination: r.destination, permanent: true }));
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Vercel restores .next/cache from the last deployment. With Turbopack's build cache on,
    // the admin once shipped the stylesheet of an older globals.css next to new pages
    // (4 Nov 2026). The sites build without that cache, so each build uses its own styles.
    turbopackFileSystemCacheForBuild: false,
  },
  images: {
    // AVIF first: about a third smaller than WebP for the same photo.
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The old WordPress site's pages, so links and search results keep working.
  async redirects() {
    return [
      ...(await adminRedirects()),
      { source: "/about-us", destination: "/", permanent: true },
      { source: "/stay-packages", destination: "/stays", permanent: true },
      { source: "/events", destination: "/celebrations#events", permanent: true },
      { source: "/destination-wedding-2", destination: "/celebrations", permanent: true },
      // The old site's gallery lived at /activities.
      { source: "/activities", destination: "/", permanent: true },
      { source: "/contact-us", destination: "/#find-us", permanent: true },
      { source: "/privacy-policy-2", destination: "/policies#privacy", permanent: true },
      { source: "/terms-conditions", destination: "/policies#terms", permanent: true },
    ];
  },
};

export default nextConfig;

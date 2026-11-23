import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// The repo's one settings file is .env.local at the root (see .env.example): this site reads
// DATABASE_URL and REVALIDATE_SECRET from it for its rooms, rates and packages. Variables
// already set, in the shell or on Vercel, win over it.
const rootEnv = resolve(process.cwd(), "../../.env.local");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

/** The old WordPress site's pages on prathameshresorts.com, moved to their new homes for good. */
const oldPages: [string, string][] = [
  ["/about-us", "/"],
  ["/stay-packages", "/stays"],
  ["/one-day-stay", "/day-packages"],
  ["/school-picnic", "/day-packages"],
  ["/activities", "/experiences"],
  ["/events", "/celebrations#events"],
  ["/destination-wedding", "/celebrations#weddings"],
  ["/destination-wedding-2", "/celebrations#weddings"],
  ["/contact-us", "/#enquire"],
  ["/contact", "/#enquire"],
  ["/hotel-term-condition", "/policies#terms"],
  ["/privacy-policy", "/policies#privacy"],
];

/**
 * Short addresses for the group's other resorts, such as prathameshresorts.com/valley.
 * Temporary redirects, so the group can reuse a path later without browsers holding on to it.
 */
const otherResorts: [string, string][] = [
  ["/go-crazy", "https://www.gocrazyadventure.com"],
  ["/gocrazy", "https://www.gocrazyadventure.com"],
  ["/sinhagad-bliss", "https://sinhagadbliss.com"],
  ["/bliss", "https://sinhagadbliss.com"],
  ["/valley", "https://www.prathameshvalleyresorts.com"],
  ["/mahabaleshwar", "https://www.prathameshvalleyresorts.com"],
];

/**
 * Redirects staff add in the admin (SEO-04, SEO-07), read at build time and
 * made permanent. The admin rebuilds this site when they change. Without
 * the admin, the site builds with its own redirects only.
 */
async function adminRedirects() {
  const admin = (process.env.ADMIN_URL ?? "https://prathamesh-admin.vercel.app").replace(/\/$/, "");
  try {
    const response = await fetch(`${admin}/api/redirects/KS`, { signal: AbortSignal.timeout(8000) });
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
  /* config options here */
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
    // Gallery photos from the admin's public Vercel Blob store.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  partialPrefetching: true,
  async redirects() {
    const fromAdmin = await adminRedirects();
    return [
      ...fromAdmin,
      ...oldPages.map(([source, destination]) => ({ source, destination, permanent: true })),
      ...otherResorts.map(([source, destination]) => ({ source, destination, permanent: false })),
    ];
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

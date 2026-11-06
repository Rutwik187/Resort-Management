import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// The repo's one settings file is .env.local at the root (see .env.example): this site reads
// DATABASE_URL and REVALIDATE_SECRET from it for its rooms, rates and packages. Variables
// already set, in the shell or on Vercel, win over it.
const rootEnv = resolve(process.cwd(), "../../.env.local");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

// The old WordPress pages, so links and search results keep working after the move.
// Next.js first drops their trailing slash, then these rules send them on.
const oldPages: [string, string][] = [
  ["/about-us", "/"],
  ["/all-amenities", "/stays#amenities"],
  ["/stay_packages", "/stays"],
  ["/cottages", "/stays"],
  ["/gallery", "/"],
  ["/activities", "/stays#amenities"],
  ["/faq", "/"],
  ["/contact-us", "/#enquire"],
  ["/destination-wedding", "/celebrations"],
  ["/events", "/celebrations#events"],
  ["/cancellation-policy", "/policies#cancellation"],
  ["/refund-policy", "/policies#refunds"],
  ["/terms-conditions", "/policies#terms"],
  ["/privacy-policy", "/policies#privacy"],
];

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
  async redirects() {
    return oldPages.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default nextConfig;

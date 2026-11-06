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

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    // AVIF first: about a third smaller than WebP for the same photo.
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
  },
  partialPrefetching: true,
  async redirects() {
    return [
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

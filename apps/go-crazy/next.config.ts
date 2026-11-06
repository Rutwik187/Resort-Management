import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// The repo's one settings file is .env.local at the root (see .env.example): this site reads
// DATABASE_URL and REVALIDATE_SECRET from it for its rooms, rates and packages. Variables
// already set, in the shell or on Vercel, win over it.
const rootEnv = resolve(process.cwd(), "../../.env.local");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

/** The current WordPress site's pages, moved to their new homes for good. */
const oldPages: [string, string][] = [
  ["/about-us", "/"],
  ["/gallery-page", "/activities"],
  ["/packages", "/day-packages"],
  ["/stay-packages", "/stays"],
  ["/school-picnic", "/schools"],
  ["/destination-wedding", "/celebrations"],
  ["/amenities", "/activities"],
  ["/contact-us", "/#enquire"],
  ["/terms-and-conditions", "/policies#terms"],
  ["/privacy-policy", "/policies#privacy"],
  ["/rules-regulations", "/policies#rules"],
];

const nextConfig: NextConfig = {
  cacheComponents: true,
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

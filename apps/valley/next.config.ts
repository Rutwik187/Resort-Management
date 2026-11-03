import type { NextConfig } from "next";

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
  // The old WordPress site's pages, so links and search results keep working.
  redirects() {
    return [
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

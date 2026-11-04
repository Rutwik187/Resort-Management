import type { NextConfig } from "next";

// The staff dashboard. Every page is per person and per resort, so nothing here is cached.
const nextConfig: NextConfig = {
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

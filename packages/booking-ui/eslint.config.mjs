import { nextJsConfig } from "@repo/eslint-config/next-js";

const config = [
  ...nextJsConfig,
  // A shared package has no pages folder for this rule to check.
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
];

export default config;

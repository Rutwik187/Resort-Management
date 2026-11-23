import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";

/** Search engines see the group site in production only; previews and staging stay out (SEO-02). */
export default function robots(): MetadataRoute.Robots {
  const live = process.env.VERCEL_ENV === "production" && Boolean(process.env.GROUP_SITE_URL);
  return live ? { rules: { userAgent: "*", allow: "/", disallow: "/search" }, sitemap: `${siteUrl}/sitemap.xml` } : { rules: { userAgent: "*", disallow: "/" } };
}

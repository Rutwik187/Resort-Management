import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/resorts", "/search", "/offers", "/weddings", "/corporate", "/blog", "/contact", "/policies"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "/policies" ? "yearly" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}

import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/stays", "/celebrations", "/explore", "/policies"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "/policies" ? "yearly" : "monthly",
    priority: path === "" ? 1 : path === "/policies" ? 0.3 : 0.8,
  }));
}

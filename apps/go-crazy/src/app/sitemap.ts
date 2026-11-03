import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/day-packages", "/activities", "/stays", "/schools", "/celebrations", "/policies"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path === "/policies" ? 0.3 : 0.8,
  }));
}

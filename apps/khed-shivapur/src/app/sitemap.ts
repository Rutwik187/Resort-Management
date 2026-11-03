import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/stays", "/day-packages", "/experiences", "/celebrations", "/policies"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}

import type { MetadataRoute } from "next";
import { blogPosts } from "@repo/sanity";
import { siteUrl } from "@/content/site";

function pages(): MetadataRoute.Sitemap {
  return ["", "/day-packages", "/activities", "/stays", "/schools", "/celebrations", "/policies"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path === "/policies" ? 0.3 : 0.8,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await blogPosts("GC");
  if (!posts.length) return pages();
  return [
    ...pages(),
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((post) => ({ url: `${siteUrl}/blog/${post.slug}`, lastModified: post.publishAt, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}

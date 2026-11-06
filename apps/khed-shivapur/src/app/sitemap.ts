import type { MetadataRoute } from "next";
import { blogPosts } from "@repo/sanity";
import { siteUrl } from "@/content/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await blogPosts("KS");
  const pages: MetadataRoute.Sitemap = ["", "/stays", "/day-packages", "/experiences", "/celebrations", "/policies"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
  if (!posts.length) return pages;
  return [
    ...pages,
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((post) => ({ url: `${siteUrl}/blog/${post.slug}`, lastModified: post.publishAt, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}

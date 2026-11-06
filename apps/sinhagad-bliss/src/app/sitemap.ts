import type { MetadataRoute } from "next";
import { blogPosts } from "@repo/sanity";
import { siteUrl } from "@/content/site";

function pages(): MetadataRoute.Sitemap {
  return [
    { path: "", priority: 1 },
    { path: "/stays", priority: 0.9 },
    { path: "/celebrations", priority: 0.8 },
    { path: "/policies", priority: 0.3 },
  ].map(({ path, priority }) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "monthly",
    priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await blogPosts("SB");
  if (!posts.length) return pages();
  return [
    ...pages(),
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((post) => ({ url: `${siteUrl}/blog/${post.slug}`, lastModified: post.publishAt, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}

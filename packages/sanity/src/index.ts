import "server-only";
import { createClient } from "@sanity/client";
import type { PortableTextBlock } from "@portabletext/react";
import type { PropertyCode } from "@repo/sites";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { sanityProject } from "./config";
import type { SanityImage } from "./image";

export type { SanityImage } from "./image";

/*
 * What a resort website reads from Sanity (docs/implementation-plan.md,
 * section 11): its blog posts, its FAQs and its policies. Each read is
 * cached. Sanity's webhook asks the admin to refresh the resort's site when
 * an editor publishes. The blog's own pages also refresh after 15 minutes,
 * so a post scheduled for later appears on time without a job. Other reads
 * last a day, so pages that only show a footer link stay cached as long as
 * they did before.
 * A site that can't reach Sanity shows its own content, or no blog.
 */

// The live API, not Sanity's CDN: the webhook fires the moment an editor
// publishes, when the CDN can still hold the old answer, and the site would
// cache that for the day. Every read here is cached, so it costs few requests.
const client = createClient({ ...sanityProject, useCdn: false, perspective: "published" });

/** The cache tag for one resort's Sanity content. */
export const contentTag = (code: PropertyCode) => `content-${code}`;

export type PostSummary = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishAt: string;
  coverImage: SanityImage;
  author: { name: string; role?: string } | null;
  categories: string[];
};

export type Post = Omit<PostSummary, "author"> & {
  body: PortableTextBlock[];
  searchTitle?: string;
  searchDescription?: string;
  author: { name: string; role?: string; bio?: string; photo?: SanityImage } | null;
};

export type Faq = { _id: string; question: string; answer: PortableTextBlock[] };

export type PolicySection = { _key: string; title: string; anchor: string; body: PortableTextBlock[] };

const image = `asset->{_id, url, metadata{lqip, dimensions{width, height}}}, hotspot, crop, alt`;
// A post is live once it is published in the Studio and its "Show from" time has passed.
const livePost = `_type == "post" && resort == $resort && defined(slug.current) && publishAt <= now()`;
const summary = `_id, title, "slug": slug.current, excerpt, publishAt, coverImage{${image}}, author->{name, role}, "categories": coalesce(categories[]->title, [])`;

const queries = {
  posts: `*[${livePost}] | order(publishAt desc) {${summary}}`,
  post: `*[${livePost} && slug.current == $slug][0] {
    ${summary}, searchTitle, searchDescription,
    author->{name, role, bio, photo{${image}}},
    body[]{..., _type == "postImage" => {${image}, caption}}
  }`,
  faqs: `*[_type == "faq" && resort == $resort && defined(question)] | order(orderRank) {_id, question, answer}`,
  hasPosts: `count(*[${livePost}]) > 0`,
  policies: `*[_type == "policies" && resort == $resort][0].sections[defined(anchor) && defined(title)]{_key, title, anchor, body}`,
};

/** Blog pages: refreshed every 15 minutes, for scheduled posts. */
async function blogFetch<T>(code: PropertyCode, query: string, params: Record<string, string>): Promise<T> {
  "use cache";
  cacheTag(contentTag(code));
  cacheLife({ stale: 300, revalidate: 900, expire: 60 * 60 * 24 * 30 });
  return client.fetch<T>(query, { resort: code, ...params });
}

/** Everything else: refreshed by the webhook, and once a day anyway. */
async function dailyFetch<T>(code: PropertyCode, query: string, params: Record<string, string>): Promise<T> {
  "use cache";
  cacheTag(contentTag(code));
  cacheLife("days");
  return client.fetch<T>(query, { resort: code, ...params });
}

const blogQueries = new Set<keyof typeof queries>(["posts", "post"]);

async function read<T>(code: PropertyCode, name: keyof typeof queries, params: Record<string, string>, fallback: T): Promise<T> {
  const fetcher = blogQueries.has(name) ? blogFetch : dailyFetch;
  try {
    return (await fetcher<T | null>(code, queries[name], params)) ?? fallback;
  } catch (error) {
    // A failed read isn't cached, so the next visit tries again.
    console.error(`The ${code} ${name} didn't load from Sanity.`, error);
    return fallback;
  }
}

/** The resort's live blog posts, newest first. */
export const blogPosts = (code: PropertyCode) => read<PostSummary[]>(code, "posts", {}, []);

/**
 * Whether the resort has a live post, for the footer's Blog link. A post
 * scheduled for later adds the link within a day, or at once when an
 * editor publishes anything.
 */
export const hasBlog = (code: PropertyCode) => read<boolean>(code, "hasPosts", {}, false);

/** One live blog post, or null when there is none at that address. */
export const blogPost = (code: PropertyCode, slug: string) => read<Post | null>(code, "post", { slug }, null);

/** The resort's FAQs, in the order the editors set. */
export const faqs = (code: PropertyCode) => read<Faq[]>(code, "faqs", {}, []);

/** The sections of the resort's policies page. Empty until an editor publishes them, so the site keeps its own text. */
export const policySections = (code: PropertyCode) => read<PolicySection[]>(code, "policies", {}, []);

/** Drops the resort's cached Sanity content, so the next visit reads it again. */
export function revalidateContent(code: PropertyCode) {
  revalidateTag(contentTag(code), { expire: 0 });
}

/** A post's date, such as "6 November 2026", in India's time. */
export const postDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** The minutes a post takes to read, at 200 words a minute. */
export function readingMinutes(body: PortableTextBlock[]) {
  const words = body
    .flatMap((block) => (Array.isArray(block.children) ? block.children : []))
    .map((child) => (typeof child?.text === "string" ? child.text : ""))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export { shareImage } from "./image";

/**
 * The posts a site prerenders when it builds. Cache Components needs at
 * least one, so a blog with no posts yet gives a placeholder that the page
 * answers with "not found". Posts published after the build get their page
 * on the first visit.
 */
export async function blogStaticParams(code: PropertyCode) {
  const posts = await blogPosts(code);
  return posts.length ? posts.map((post) => ({ slug: post.slug })) : [{ slug: "no-posts-yet" }];
}

/** A post's structured data (schema.org BlogPosting), so search engines read its date, author and photo. */
export function postJsonLd(post: Post, site: { url: string; name: string }) {
  const url = `${site.url}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.searchDescription || post.excerpt,
    datePublished: post.publishAt,
    url,
    mainEntityOfPage: url,
    image: post.coverImage.asset ? [post.coverImage.asset.url] : undefined,
    author: post.author ? { "@type": "Person", name: post.author.name } : { "@type": "Organization", name: site.name },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };
}

/** Writes JSON-LD for a script tag, so "</script>" inside a post can't end the tag early. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

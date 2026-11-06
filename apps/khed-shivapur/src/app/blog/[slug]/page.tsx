import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { blogPost, blogPosts, blogStaticParams, jsonLd, postDate, postJsonLd, readingMinutes, shareImage } from "@repo/sanity";
import { RichText, SanityPhoto } from "@repo/sanity/rich-text";
import { PageTransition } from "@/components/page-transition";
import { pageMetadata, siteName, siteUrl } from "@/content/site";

export const generateStaticParams = () => blogStaticParams("KS");

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await blogPost("KS", slug);
  if (!post) return { title: "Post not found", robots: { index: false } };
  const base = pageMetadata({ title: post.searchTitle || post.title, description: post.searchDescription || post.excerpt, path: `/blog/${post.slug}` });
  const image = shareImage(post.coverImage);
  return {
    ...base,
    openGraph: { ...base.openGraph, type: "article", publishedTime: post.publishAt, images: image ? [image] : base.openGraph?.images },
    twitter: { ...base.twitter, images: image ? [image] : base.twitter?.images },
  };
}

async function Post({ params }: { params: PageProps<"/blog/[slug]">["params"] }) {
  const { slug } = await params;
  const [post, all] = await Promise.all([blogPost("KS", slug), blogPosts("KS")]);
  if (!post) notFound();
  const more = all.filter((p) => p.slug !== post.slug).slice(0, 2);
  return (
    <article className="bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(postJsonLd(post, { url: siteUrl, name: siteName })) }} />
      <header className="mx-auto max-w-[1680px] px-5 pb-12 pt-28 md:px-10 md:pb-16 md:pt-36">
        <Link href="/blog" className="label link-line text-fern">
          ← Blog
        </Link>
        <h1 className="mt-8 max-w-5xl text-[clamp(2.6rem,5.6vw,5.8rem)]">{post.title}</h1>
        <p className="lead mt-8 max-w-3xl text-fern">{post.excerpt}</p>
        <p className="label mt-8 text-fern">
          {[post.author?.name, postDate(post.publishAt), `${readingMinutes(post.body)} min read`].filter(Boolean).join(" · ")}
        </p>
      </header>

      <div className="mx-auto max-w-[1680px] px-5 md:px-10">
        <SanityPhoto image={post.coverImage} aspect={16 / 9} sizes="(min-width: 1680px) 1600px, 100vw" priority className="h-auto w-full rounded-[1.25rem]" />
      </div>

      <div className="mx-auto max-w-[46rem] px-5 py-16 md:py-24">
        <RichText value={post.body} />
        {post.categories.length > 0 && (
          <ul className="mt-14 flex flex-wrap gap-2" aria-label="Categories">
            {post.categories.map((c) => (
              <li key={c} className="label rounded-full border border-forest/15 px-3 py-1.5 text-fern">
                {c}
              </li>
            ))}
          </ul>
        )}
        {post.author && (
          <div className="mt-14 flex items-center gap-5 border-t border-forest/10 pt-8">
            {post.author.photo?.asset && <SanityPhoto image={post.author.photo} aspect={1} sizes="4rem" className="size-16 shrink-0 rounded-full" />}
            <div>
              <p className="font-medium">{post.author.name}</p>
              {post.author.role && <p className="text-[0.95rem] text-fern">{post.author.role}</p>}
              {post.author.bio && <p className="mt-2 text-[0.95rem] text-fern">{post.author.bio}</p>}
            </div>
          </div>
        )}
      </div>

      {more.length > 0 && (
        <aside aria-labelledby="more-title" className="border-t border-forest/10">
          <div className="mx-auto max-w-[1680px] px-5 py-16 md:px-10 md:py-24">
            <h2 id="more-title" className="text-[clamp(2rem,3.4vw,3.2rem)]">
              More from the <em>blog</em>
            </h2>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2">
              {more.map((p) => (
                <Link key={p._id} href={`/blog/${p.slug}`} className="group grid content-start gap-4">
                  <span className="zoom-on-hover block overflow-hidden rounded-[1.25rem]">
                    <SanityPhoto image={p.coverImage} aspect={3 / 2} sizes="(min-width: 640px) 45vw, 100vw" className="h-auto w-full" />
                  </span>
                  <span className="label text-fern">{postDate(p.publishAt)}</span>
                  <span className="display text-[clamp(1.6rem,2vw,2rem)] group-hover:text-sun-deep">{p.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      )}
    </article>
  );
}

export default function PostPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <PageTransition>
      <Suspense fallback={<div className="min-h-svh bg-paper" />}>
        <Post params={params} />
      </Suspense>
    </PageTransition>
  );
}

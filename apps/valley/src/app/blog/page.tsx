import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts, postDate, type PostSummary } from "@repo/sanity";
import { SanityPhoto } from "@repo/sanity/rich-text";
import { PageTransition } from "@/components/page-transition";
import { pageMetadata } from "@/content/site";

const description = "Stories, guides and news from Prathamesh Valley Resorts, at Bhilar, Mahabaleshwar.";

export async function generateMetadata(): Promise<Metadata> {
  const posts = await blogPosts("PV");
  // An empty blog stays out of search results until its first post.
  return { ...pageMetadata({ title: "Blog", description, path: "/blog" }), ...(posts.length ? {} : { robots: { index: false } }) };
}

function PostCard({ post, featured = false }: { post: PostSummary; featured?: boolean }) {
  return (
    <article className={featured ? "grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10" : "grid content-start gap-5"}>
      <Link href={`/blog/${post.slug}`} className={`zoom-on-hover block overflow-hidden rounded-[6px] ${featured ? "lg:col-span-7" : ""}`} tabIndex={-1} aria-hidden>
        <SanityPhoto
          image={post.coverImage}
          aspect={featured ? 3 / 2 : 4 / 3}
          sizes={featured ? "(min-width: 1024px) 56vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"}
          priority={featured}
          className="h-auto w-full"
        />
      </Link>
      <div className={featured ? "lg:col-span-5 lg:pb-4" : ""}>
        <p className="label text-moss">
          {[...post.categories.slice(0, 1), postDate(post.publishAt)].join(" · ")}
        </p>
        <h2 className={`mt-4 ${featured ? "text-[clamp(2.2rem,3.6vw,3.6rem)]" : "text-[clamp(1.7rem,2.2vw,2.2rem)]"}`}>
          <Link href={`/blog/${post.slug}`} className="hover:text-laterite">
            {post.title}
          </Link>
        </h2>
        <p className="mt-4 text-moss">{post.excerpt}</p>
      </div>
    </article>
  );
}

export default async function BlogPage() {
  const [first, ...rest] = await blogPosts("PV");
  return (
    <PageTransition>
      <div className="bg-mist">
        <header className="mx-auto max-w-[1600px] px-5 pb-14 pt-28 md:px-10 md:pb-20 md:pt-36">
          <p className="label text-moss">Blog</p>
          <h1 className="mt-6 max-w-4xl text-[clamp(2.8rem,5.4vw,5.4rem)]">
            Notes from <em>Mahabaleshwar</em>
          </h1>
          <p className="mt-6 max-w-xl text-moss">Guides for your stay, news from the resort and the seasons in the strawberry hills.</p>
        </header>

        <div className="mx-auto max-w-[1600px] border-t border-ink/10 px-5 py-16 md:px-10 md:py-24">
          {first ? (
            <>
              <PostCard post={first} featured />
              {rest.length > 0 && (
                <div className="mt-20 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="max-w-xl text-moss">
              The first posts are on their way. Meanwhile, see the{" "}
              <Link href="/stays" className="underline underline-offset-4 hover:text-ink">
                rooms and rates
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

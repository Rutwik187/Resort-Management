import { Suspense } from "react";
import Link from "next/link";
import { blogPosts, postDate } from "@repo/sanity";
import { resortOf, resorts } from "@/content/resorts";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({ title: "Blog", description: "Stories and guides from the four Prathamesh resorts.", path: "/blog" });

/**
 * Every resort's posts in one list, filterable by resort and category
 * (URD 4.1, CMS-07). Each post opens on its own resort's site, where it is
 * canonical (SEO-05).
 */
export default function BlogPage({ searchParams }: PageProps<"/blog">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 md:px-8">
      <h1 className="display text-[clamp(2.4rem,5vw,4rem)] text-forest">Blog</h1>
      <Suspense fallback={null}>
        <Posts searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Posts({ searchParams }: { searchParams: PageProps<"/blog">["searchParams"] }) {
  const q = await searchParams;
  const pick = resortOf(String(q.resort ?? ""))?.code;
  const category = typeof q.category === "string" ? q.category : undefined;
  const all = (await Promise.all(resorts.map(async (r) => (await blogPosts(r.code)).map((p) => ({ ...p, resort: r }))))).flat().sort((a, b) => b.publishAt.localeCompare(a.publishAt));
  const categories = [...new Set(all.flatMap((p) => p.categories))].sort();
  const shown = all.filter((p) => (!pick || p.resort.code === pick) && (!category || p.categories.includes(category)));
  const link = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(Object.entries({ resort: pick, category, ...changes }).filter((e): e is [string, string] => Boolean(e[1])));
    const text = params.toString();
    return text ? `/blog?${text}` : "/blog";
  };
  return (
    <>
      <nav aria-label="Resort" className="mt-6 flex flex-wrap gap-2">
        {[{ code: "", shortName: "All resorts" }, ...resorts].map((r) => (
          <Link key={r.code || "all"} href={link({ resort: r.code || undefined })} className={`rounded-full px-4 py-2 text-[0.95rem] ${(pick ?? "") === r.code ? "bg-forest text-white" : "border border-ink/15"}`}>
            {r.shortName}
          </Link>
        ))}
      </nav>
      {categories.length > 0 && (
        <nav aria-label="Category" className="mt-3 flex flex-wrap gap-2 text-[0.9rem]">
          {categories.map((c) => (
            <Link key={c} href={link({ category: category === c ? undefined : c })} className={`rounded-full px-3 py-1 ${category === c ? "bg-clay text-white" : "bg-sand"}`}>
              {c}
            </Link>
          ))}
        </nav>
      )}
      {shown.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-ink/20 p-8 text-muted">No posts yet.</p>
      ) : (
        <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((post) => (
            <li key={post._id} className="rounded-3xl bg-white p-6">
              <p className="text-[0.8rem] uppercase tracking-[0.12em] text-clay">
                {post.resort.shortName} · {postDate(post.publishAt)}
              </p>
              <a href={`${post.resort.url}/blog/${post.slug}`} className="display mt-2 block text-[1.5rem] leading-tight hover:underline">
                {post.title}
              </a>
              <p className="mt-2 line-clamp-3 text-muted">{post.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

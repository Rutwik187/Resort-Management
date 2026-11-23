import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { blogPosts } from "@repo/sanity";
import { liveFromPrice, liveOfferDays, liveReviews } from "@repo/website";
import { OffersToday } from "@/components/offers-today";
import { SearchForm } from "@/components/search-form";
import { photos, resorts, rupees } from "@/content/resorts";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({ description: "Four resorts of the Prathamesh Group near Pune and in Mahabaleshwar. Search them together, then book on the resort's own site.", path: "" });

/**
 * The group's home (URD 4.1): the four resorts, a search across them, the
 * Offers of the Day, Google ratings, the latest posts, and the wedding and
 * corporate enquiries.
 */
export default function Home() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-forest text-white">
        <div aria-hidden className="absolute inset-0 -z-10 grid grid-cols-2 opacity-45 md:grid-cols-4">
          {resorts.map((r) => (
            <Image key={r.code} src={photos[r.code].src} alt="" className="h-full w-full object-cover" sizes="25vw" priority />
          ))}
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-forest/40 via-forest/70 to-forest" />
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-20 md:px-8 md:pb-20 md:pt-28">
          <p className="text-[0.85rem] font-medium uppercase tracking-[0.18em] text-white/80">The Prathamesh Group</p>
          <h1 className="display mt-4 max-w-3xl text-[clamp(2.8rem,6vw,5.2rem)] leading-[1.02]">Four resorts in the Sahyadri. One search.</h1>
          <p className="mt-4 max-w-xl text-[1.1rem] text-white/85">By the river at Khed Shivapur, beneath Sinhagad fort, and in the hills of Mahabaleshwar. See what is free at each, then book on the resort&apos;s own site.</p>
          <div className="mt-8 max-w-5xl">
            <SearchForm resorts={resorts.map((r) => ({ code: r.code, name: r.name }))} />
          </div>
        </div>
      </section>

      <section aria-labelledby="resorts" className="mx-auto mt-16 max-w-7xl px-4 md:px-8">
        <h2 id="resorts" className="display text-[2.2rem] text-forest">
          Our resorts
        </h2>
        <Suspense fallback={<ResortCards prices={{}} />}>
          <PricedResorts />
        </Suspense>
      </section>

      <div className="mt-16">
        <Suspense fallback={null}>
          <TodayOffers />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <Ratings />
      </Suspense>

      <section className="mx-auto mt-16 grid max-w-7xl gap-4 px-4 md:grid-cols-2 md:px-8">
        <Link href="/weddings" className="group rounded-3xl bg-clay-soft p-8 transition-colors hover:bg-clay-soft/70">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-clay">Weddings and events</p>
          <p className="display mt-2 text-[2rem] leading-tight">Lawns, halls and rooms for the whole family, at four resorts.</p>
          <p className="mt-3 text-forest underline-offset-4 group-hover:underline">Plan a wedding →</p>
        </Link>
        <Link href="/corporate" className="group rounded-3xl bg-sand p-8 transition-colors hover:bg-sand/70">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-forest">Corporate</p>
          <p className="display mt-2 text-[2rem] leading-tight">Offsites, team outings, conferences and day events.</p>
          <p className="mt-3 text-forest underline-offset-4 group-hover:underline">Send a corporate enquiry →</p>
        </Link>
      </section>

      <Suspense fallback={null}>
        <LatestPosts />
      </Suspense>
    </>
  );
}

async function PricedResorts() {
  const prices = Object.fromEntries(await Promise.all(resorts.map(async (r) => [r.code, await liveFromPrice(r.code)] as const)));
  return <ResortCards prices={prices} />;
}

function ResortCards({ prices }: { prices: Record<string, { paise: number; basis: "room" | "person" } | null> }) {
  return (
    <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {resorts.map((r) => {
        const price = prices[r.code];
        return (
          <li key={r.code} className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_40px_-30px_rgb(0_0_0/0.4)]">
            <Image src={photos[r.code].src} alt={photos[r.code].alt} className="aspect-[4/3] w-full object-cover" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
            <div className="p-5">
              <p className="display text-[1.45rem] leading-tight">{r.name}</p>
              <p className="text-[0.9rem] text-muted">{r.place}</p>
              <p className="mt-3 text-[0.95rem]">{r.pitch}.</p>
              {price && (
                <p className="mt-3 text-[0.95rem]">
                  From <span className="font-semibold">{rupees(price.paise)}</span> <span className="text-muted">{price.basis === "person" ? "a person" : "a couple"}, a night, plus GST</span>
                </p>
              )}
              <a href={r.url} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-forest/30 px-4 text-forest hover:bg-forest hover:text-white">
                Visit {r.shortName}
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function TodayOffers() {
  const items = await Promise.all(resorts.map(async (r) => ({ resort: r.shortName, href: `${r.url}/offers`, days: (await liveOfferDays(r.code)).map((d) => ({ day: d.day, title: d.title, label: d.label, details: d.details })) })));
  return <OffersToday items={items} />;
}

async function Ratings() {
  const all = await Promise.all(resorts.map(async (r) => ({ resort: r, reviews: await liveReviews(r.code) })));
  const rated = all.filter((a) => a.reviews?.rating);
  if (!rated.length) return null;
  return (
    <section aria-labelledby="ratings" className="mx-auto mt-16 max-w-7xl px-4 md:px-8">
      <h2 id="ratings" className="display text-[2rem] text-forest">
        Loved across the group
      </h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rated.map(({ resort, reviews }) => (
          <li key={resort.code} className="rounded-2xl border border-ink/10 bg-white p-5">
            <p className="font-medium">{resort.name}</p>
            <p className="mt-1">
              <span className="text-[1.5rem] font-semibold">{reviews!.rating}</span> <span className="text-[#f5a623]">★</span> <span className="text-muted">{reviews!.count ?? 0} Google reviews</span>
            </p>
            {reviews!.listingUrl && (
              <a href={reviews!.listingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[0.9rem] text-forest underline underline-offset-4">
                Read them on Google
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.8rem] text-muted">Ratings from Google.</p>
    </section>
  );
}

async function LatestPosts() {
  const posts = (await Promise.all(resorts.map(async (r) => (await blogPosts(r.code)).map((p) => ({ ...p, resort: r }))))).flat().sort((a, b) => b.publishAt.localeCompare(a.publishAt));
  if (!posts.length) return null;
  return (
    <section aria-labelledby="latest" className="mx-auto mt-16 max-w-7xl px-4 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <h2 id="latest" className="display text-[2rem] text-forest">
          From the blog
        </h2>
        <Link href="/blog" className="text-forest underline underline-offset-4">
          All posts
        </Link>
      </div>
      <ul className="mt-5 grid gap-4 md:grid-cols-3">
        {posts.slice(0, 3).map((post) => (
          <li key={post._id} className="rounded-2xl border border-ink/10 bg-white p-5">
            <p className="text-[0.8rem] uppercase tracking-[0.12em] text-clay">{post.resort.shortName}</p>
            <a href={`${post.resort.url}/blog/${post.slug}`} className="display mt-1 block text-[1.4rem] leading-tight hover:underline">
              {post.title}
            </a>
            <p className="mt-2 line-clamp-3 text-muted">{post.excerpt}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

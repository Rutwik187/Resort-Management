import "server-only";
import { Suspense } from "react";
import type { PropertyCode } from "@repo/sites";
import { liveReviews } from "./index";

/*
 * Google reviews on a resort's site (REV-02 to REV-06): the rating and
 * count exactly as Google reports them, each review with the reviewer's
 * name, photo, stars, date and text, Google's attribution and a link to the
 * listing, and a button to write a review. No review-star structured data:
 * Google doesn't allow it for a business's own reviews (REV-06). Nothing
 * shows until the admin has read the reviews.
 */

const stars = (rating: number) => "★".repeat(Math.max(0, Math.min(5, rating))) + "☆".repeat(Math.max(0, 5 - rating));
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "");

async function Reviews({ code, className, title }: { code: PropertyCode; className?: string; title: string }) {
  const data = await liveReviews(code);
  if (!data || (!data.rating && data.items.length === 0)) return null;
  return (
    <section aria-labelledby={`reviews-${code}`} className={`text-bk-ink ${className ?? ""}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id={`reviews-${code}`} className="bk-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight">
            {title}
          </h2>
          {data.rating && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-bk-muted">
              <span className="text-[1.4rem] font-semibold text-bk-ink">{data.rating}</span>
              <span aria-hidden className="text-[#f5a623]">
                {stars(Math.round(Number(data.rating)))}
              </span>
              <span>
                {data.count ?? 0} reviews on Google
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {data.listingUrl && (
            <a href={data.listingUrl} target="_blank" rel="noreferrer" className="bk-button inline-flex min-h-11 items-center rounded-bk-control border border-bk-line px-4">
              All reviews on Google
            </a>
          )}
          {data.writeUrl && (
            <a href={data.writeUrl} target="_blank" rel="noreferrer" className="bk-button inline-flex min-h-11 items-center rounded-bk-control bg-bk-accent px-4 text-bk-accent-ink">
              Write a review
            </a>
          )}
        </div>
      </div>
      {data.items.length > 0 && (
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {data.items.slice(0, 3).map((review) => (
            <li key={review.id} className="flex flex-col rounded-bk border border-bk-line bg-bk-card p-5">
              <div className="flex items-center gap-3">
                {review.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Google's own photo address, shown as Google gives it.
                  <img src={review.photoUrl} alt="" width={40} height={40} referrerPolicy="no-referrer" className="size-10 rounded-full object-cover" />
                ) : (
                  <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-bk-soft font-semibold">
                    {review.author.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0">
                  {review.authorUrl ? (
                    <a href={review.authorUrl} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">
                      {review.author}
                    </a>
                  ) : (
                    <p className="truncate font-medium">{review.author}</p>
                  )}
                  <p className="text-[0.85rem] text-bk-muted">{when(review.reviewedAt)}</p>
                </div>
              </div>
              <p className="mt-3 text-[#f5a623]" aria-label={`${review.rating} out of 5 stars`}>
                {stars(review.rating)}
              </p>
              {review.text && <p className="mt-2 line-clamp-6 text-[0.95rem] leading-relaxed text-bk-muted">{review.text}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[0.8rem] text-bk-muted">Reviews and rating from Google.</p>
    </section>
  );
}

/** The reviews section, for a page. It never holds the page up. */
export function GoogleReviews({ code, className, title = "What guests say" }: { code: PropertyCode; className?: string; title?: string }) {
  return (
    <Suspense fallback={null}>
      <Reviews code={code} className={className} title={title} />
    </Suspense>
  );
}

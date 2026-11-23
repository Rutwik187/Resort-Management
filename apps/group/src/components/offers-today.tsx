"use client";

import { useSyncExternalStore } from "react";

const noChange = () => () => {};
const indiaToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/** Today's Offer of the Day at each resort (URD 4.1), picked by India's date in the browser. Hidden when none runs today. */
export function OffersToday({ items }: { items: { resort: string; href: string; days: { day: string; title: string; label: string; details: string | null }[] }[] }) {
  // Today in India, read in the browser; nothing on the server, so a cached page never shows yesterday's offer.
  const today = useSyncExternalStore(noChange, indiaToday, () => null);
  if (!today) return null;
  const live = items.flatMap((item) => item.days.filter((d) => d.day === today).map((d) => ({ ...d, resort: item.resort, href: item.href })));
  if (!live.length) return null;
  return (
    <section aria-labelledby="today" className="mx-auto max-w-7xl px-4 md:px-8">
      <h2 id="today" className="display text-[2rem] text-forest">
        Offers of the day
      </h2>
      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {live.map((offer) => (
          <li key={offer.resort} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-clay/30 bg-clay-soft/60 p-5">
            <div>
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-clay">
                {offer.resort} · {offer.label} · today only
              </p>
              <p className="display mt-1 text-[1.5rem] leading-tight">{offer.title}</p>
              {offer.details && <p className="mt-1 text-muted">{offer.details}</p>}
            </div>
            <a href={offer.href} className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-white">
              Book at the resort
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

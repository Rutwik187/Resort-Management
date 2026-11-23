import "server-only";
import { Suspense } from "react";
import { OfferOfTheDayStrip } from "@repo/booking-ui/offer-of-day";
import type { PropertyCode } from "@repo/sites";
import { liveOfferDays, liveOffers } from "./index";

/*
 * Offers on a resort's website (OFR-01, OFR-02): the Offer of the Day strip
 * for the home page, and the list of live offers with their terms and
 * validity for the Offers page. Both read the admin's catalogue, so staff
 * changes reach them when the admin refreshes the site.
 */

async function Strip({ code, className }: { code: PropertyCode; className?: string }) {
  const days = await liveOfferDays(code);
  return days.length ? <OfferOfTheDayStrip days={days} className={className} /> : null;
}

/** Today's Offer of the Day with its countdown, or nothing. It never holds up the page. */
export function OfferOfTheDay({ code, className }: { code: PropertyCode; className?: string }) {
  return (
    <Suspense fallback={null}>
      <Strip code={code} className={className} />
    </Suspense>
  );
}

const scope = { stay: "Stays", day: "Day visits", any: "Stays and day visits" } as const;

/** Every live offer, as cards in the site's booking colours. Says so when there are none. */
export async function OffersList({ code, empty, bookHref = "/stays" }: { code: PropertyCode; empty: React.ReactNode; bookHref?: string }) {
  const [offers, days] = await Promise.all([liveOffers(code), liveOfferDays(code)]);
  return (
    <div className="grid gap-8 text-bk-ink">
      {days.length > 0 && <OfferOfTheDayStrip days={days} href={bookHref} label="Book now" />}
      {offers.length === 0 ? (
        <div className="rounded-bk border border-dashed border-bk-line p-8 text-bk-muted">{empty}</div>
      ) : (
        <ul id="offers" className="grid scroll-mt-28 gap-5 md:grid-cols-2">
          {offers.map((offer) => (
            <li key={offer.title} className="flex flex-col rounded-bk border border-bk-line bg-bk-card p-6">
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-bk-accent">
                {offer.label} · {scope[offer.appliesTo]}
              </p>
              <h2 className="bk-display mt-2 text-[1.6rem] leading-tight">{offer.title}</h2>
              {offer.details && <p className="mt-2 text-bk-muted">{offer.details}</p>}
              {offer.code && (
                <p className="mt-4">
                  Code <span className="ml-1 rounded-bk-control border border-dashed border-bk-ink px-2.5 py-1 font-mono font-semibold tracking-wider">{offer.code}</span>
                </p>
              )}
              {offer.terms.length > 0 && (
                <ul className="mt-4 grid gap-1.5 border-t border-bk-line pt-4 text-[0.9rem] text-bk-muted">
                  {offer.terms.map((term) => (
                    <li key={term} className="flex gap-2">
                      <span aria-hidden>·</span>
                      {term}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

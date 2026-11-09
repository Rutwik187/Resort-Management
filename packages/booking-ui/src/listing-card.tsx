"use client";

import { isWeekendNight, plural } from "./dates";
import { PhotoStrip } from "./photo-strip";
import { basisLabel, describeParty, formatRupees, lowestRate, priceForNight, priceForStay } from "./pricing";
import type { Listing, Party, Rate } from "./types";

type ListingCardProps = {
  listing: Listing;
  /** The nights of the guest's stay, empty until they choose dates. */
  nights: string[];
  /** How many of this listing the guest has already added. */
  count: number;
  /** Who would stay in it next, from the guests still to place. The card prices the stay for them. */
  suggested: Party;
  onPick: () => void;
  imageSizes?: string;
  /** Live free rooms for the guest's dates, and why it can't be booked, if a stay rule says no. Missing until known. */
  stock?: { free: number; note: string | null };
};

/**
 * One room type, villa or package as a row in the list: photos, what it is,
 * its rates and, once the guest has dates, the price of their stay. The
 * button opens the panel that asks who stays in it.
 */
export function ListingCard({ listing, nights, count, suggested, onPick, imageSizes = "(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw", stock }: ListingCardProps) {
  // Sold out, or closed by a stay rule, for these dates: it stays in the list, marked, so the guest knows to try other dates.
  const soldOut = stock !== undefined && (stock.note !== null || stock.free === 0);
  const allFreeAdded = stock !== undefined && !soldOut && count >= stock.free;
  const allAdded = listing.units !== undefined && count >= listing.units;
  const full = soldOut || allFreeAdded || allAdded;
  const label = soldOut
    ? stock.note
      ? "Not available"
      : "Sold out"
    : allFreeAdded
      ? `All ${plural(stock.free, `free ${listing.noun}`)} added`
      : allAdded
        ? `All ${plural(listing.units!, listing.noun)} added`
        : count > 0
          ? `Add another ${listing.noun}`
          : `Add ${listing.noun}`;
  // "Only 2 left" only when some are taken: a resort's one villa, free, is not running out.
  const few = stock !== undefined && !soldOut && stock.free - count > 0 && stock.free <= 3 && (listing.units === undefined || stock.free < listing.units);

  return (
    <article
      id={listing.id}
      aria-labelledby={`${listing.id}-name`}
      className="scroll-mt-[calc(var(--bk-sticky-top)+5rem)] rounded-bk border border-bk-line bg-bk-card p-3 text-bk-ink sm:p-4"
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-6">
        <PhotoStrip photos={listing.photos} name={listing.name} sizes={imageSizes} />

        <div className="min-w-0 px-1 md:pt-1">
          <h3 id={`${listing.id}-name`} className="bk-display text-[1.6rem] sm:text-[1.85rem]">
            {listing.name}
          </h3>
          <p className="mt-1.5 text-[0.95rem] leading-snug text-bk-muted">{listing.line}</p>
          {listing.facts.length > 0 && (
            <ul className="mt-3.5 flex flex-wrap gap-1.5">
              {listing.facts.map((fact) => (
                <li key={fact} className="rounded-full bg-bk-soft px-3 py-1 text-[0.8rem] leading-tight">
                  {fact}
                </li>
              ))}
            </ul>
          )}
          {(listing.details || listing.features?.length) && (
            <details className="group mt-3.5 border-t border-bk-line pt-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[0.9rem] [&::-webkit-details-marker]:hidden">
                Details and what is included
                <span aria-hidden className="text-[1.1rem] transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              {listing.details && <p className="pb-2 text-[0.9rem] leading-relaxed text-bk-muted">{listing.details}</p>}
              {listing.features && (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pb-2 text-[0.85rem] text-bk-muted">
                  {listing.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              )}
            </details>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-bk-line px-1 pt-4 md:col-span-2 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-end lg:col-span-1 lg:flex lg:border-l lg:border-t-0 lg:pl-6 lg:pt-1">
          <div className="min-w-0">
            <Rates listing={listing} nights={nights} />
            {nights.length > 0 && !listing.onRequest && <YourStay listing={listing} party={suggested} nights={nights} />}
          </div>
          <div className="lg:mt-auto">
            <button
              type="button"
              onClick={onPick}
              disabled={full}
              className="min-h-12 w-full rounded-bk-control bg-bk-accent px-6 bk-button text-bk-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 md:min-w-[12rem]"
            >
              {label}
            </button>
            {soldOut && <p className="mt-2 text-center text-[0.84rem] text-bk-alert">{stock.note ?? "Sold out for these dates. Try other dates."}</p>}
            {few && <p className="mt-2 text-center text-[0.84rem] text-bk-alert">Only {stock.free} left for these dates</p>}
            {count > 0 && (
              <p className="mt-2 text-center text-[0.84rem] text-bk-good">
                <span aria-hidden>✓ </span>
                {count} in your stay
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** The published rates, with the nights of the guest's stay that fall on each. */
function Rates({ listing, nights }: { listing: Listing; nights: string[] }) {
  if (listing.onRequest) {
    return (
      <div>
        <p className="bk-display text-[1.4rem]">{listing.onRequest}</p>
        <p className="mt-1 text-[0.85rem] text-bk-muted">Add it, and our team sends you a quote.</p>
      </div>
    );
  }
  const weekendNights = nights.filter(isWeekendNight).length;
  const rows: { label: string; rate: Rate; nights: number }[] = listing.everyNight
    ? [{ label: "Every night", rate: listing.everyNight, nights: nights.length }]
    : [
        ...(listing.weekday ? [{ label: "Sun to Thu", rate: listing.weekday, nights: nights.length - weekendNights }] : []),
        ...(listing.weekend ? [{ label: "Fri and Sat", rate: listing.weekend, nights: weekendNights }] : []),
      ];
  const basis = lowestRate(listing);
  return (
    <div className="min-w-0">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-1">
        {rows.map((row) => (
          <div key={row.label} className={`transition-opacity ${nights.length && row.nights === 0 ? "opacity-45" : ""}`}>
            <dt className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.82rem] text-bk-muted">
              {row.label}
              {nights.length > 0 && row.nights > 0 && <span className="text-bk-ink">{plural(row.nights, "night")}</span>}
            </dt>
            <dd>
              <span className="bk-display text-[1.5rem] leading-none tabular-nums">{formatRupees(row.rate.base)}</span>
              {row.rate.meals && <span className="mt-1 block text-[0.8rem] leading-snug text-bk-muted">{row.rate.meals}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {basis && <p className="mt-2.5 text-[0.8rem] text-bk-muted">{basisLabel(basis)}, a night, plus GST</p>}
    </div>
  );
}

/** What the guest's own dates come to, for the party the panel would start with. */
function YourStay({ listing, party, nights }: { listing: Listing; party: Party; nights: string[] }) {
  const total = priceForStay(listing, party, nights);
  return (
    <div className="mt-3 rounded-[calc(var(--bk-radius)*0.6)] bg-bk-soft px-3 py-2.5">
      <p className="text-[0.8rem] leading-snug text-bk-muted">
        Your {plural(nights.length, "night")}, {describeParty(party)}
      </p>
      <p className="mt-0.5">
        <span className="bk-display text-[1.35rem] tabular-nums">{total === null ? "Rate to confirm" : formatRupees(total)}</span>
        {total !== null && <span className="text-[0.8rem] text-bk-muted"> plus GST</span>}
      </p>
    </div>
  );
}

/** The price of this listing for the party in the panel. */
export function PartyPrice({ listing, party, nights }: { listing: Listing; party: Party; nights: string[] }) {
  if (listing.onRequest) return <span className="text-bk-muted">{listing.onRequest}. Our team sends a quote.</span>;
  if (nights.length > 0) {
    const total = priceForStay(listing, party, nights);
    return total === null ? (
      <span className="text-bk-muted">Our team confirms the rate for this party.</span>
    ) : (
      <span>
        <span className="bk-display block text-[1.45rem] leading-tight tabular-nums">{formatRupees(total)}</span>
        <span className="text-[0.82rem] text-bk-muted">for {plural(nights.length, "night")}, plus GST</span>
      </span>
    );
  }
  const rate = listing.everyNight ?? listing.weekday ?? listing.weekend;
  const night = rate ? priceForNight(rate, party) : null;
  return night === null ? (
    <span className="text-bk-muted">Choose dates to see the price.</span>
  ) : (
    <span>
      <span className="bk-display block text-[1.45rem] leading-tight tabular-nums">{formatRupees(night)}</span>
      <span className="text-[0.82rem] text-bk-muted">a night{listing.everyNight ? "" : ", Sun to Thu"}, plus GST</span>
    </span>
  );
}

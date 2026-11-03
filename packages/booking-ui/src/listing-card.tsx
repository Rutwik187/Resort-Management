"use client";

import { useRef, useState } from "react";
import { isWeekendNight, plural } from "./dates";
import { PartyPicker } from "./party-picker";
import { PhotoStrip } from "./photo-strip";
import { basisLabel, formatRupees, lowestRate, priceForNight, priceForStay } from "./pricing";
import type { Listing, Party, Rate } from "./types";

type ListingCardProps = {
  listing: Listing;
  /** The nights of the guest's stay, empty until they choose dates. */
  nights: string[];
  /** How many of this listing the guest has already added. */
  count: number;
  /** Who the picker starts with, from the guests still to place. */
  suggested: Party;
  onAdd: (party: Party) => void;
  imageSizes?: string;
};

/**
 * One room type, villa or package, as a row in the list: photos, what it is,
 * its rates, and the button that adds it to the stay. Adding asks who will
 * stay in it first, so the price in the tray is for real people.
 */
export function ListingCard({ listing, nights, count, suggested, onAdd, imageSizes = "(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw" }: ListingCardProps) {
  const [picking, setPicking] = useState(false);
  const [party, setParty] = useState<Party>(suggested);
  const [added, setAdded] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const full = listing.units !== undefined && count >= listing.units;

  const open = () => {
    setParty(suggested);
    setPicking(true);
    setAdded(false);
  };
  const close = () => {
    setPicking(false);
    requestAnimationFrame(() => addRef.current?.focus());
  };

  return (
    <article id={listing.id} aria-labelledby={`${listing.id}-name`} className="scroll-mt-28 rounded-bk border border-bk-line bg-bk-card p-3 text-bk-ink sm:p-4">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,0.78fr)] lg:gap-6">
        <PhotoStrip photos={listing.photos} name={listing.name} sizes={imageSizes} />

        <div className="min-w-0 px-1 md:pt-1">
          <h3 id={`${listing.id}-name`} className="bk-display text-[1.65rem] sm:text-[1.85rem]">
            {listing.name}
          </h3>
          <p className="mt-2 text-[0.95rem] leading-snug text-bk-muted">{listing.line}</p>
          {listing.facts.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {listing.facts.map((fact) => (
                <li key={fact} className="rounded-full bg-bk-soft px-3 py-1 text-[0.8rem] leading-tight">
                  {fact}
                </li>
              ))}
            </ul>
          )}
          {(listing.details || listing.features?.length) && (
            <details className="group mt-4 border-t border-bk-line pt-2">
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

        <div className="flex flex-col justify-between gap-5 border-t border-bk-line px-1 pt-4 md:col-span-2 md:flex-row md:items-end lg:col-span-1 lg:flex-col lg:items-stretch lg:border-l lg:border-t-0 lg:pl-6 lg:pt-1">
          <Rates listing={listing} nights={nights} />
          <div>
            <button
              ref={addRef}
              type="button"
              onClick={open}
              disabled={full || picking}
              aria-expanded={picking}
              className="min-h-12 w-full rounded-bk-control bg-bk-accent px-5 text-[0.95rem] font-medium text-bk-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto lg:w-full"
            >
              {full ? `All ${plural(listing.units!, listing.noun)} added` : count > 0 ? `Add another ${listing.noun}` : `Add ${listing.noun}`}
            </button>
            <p aria-live="polite" className="mt-2 min-h-[1.25rem] text-center text-[0.82rem] text-bk-good md:text-left lg:text-center">
              {added ? `Added. See it in your selection.` : count > 0 ? `${count} in your selection` : ""}
            </p>
          </div>
        </div>
      </div>

      {picking && (
        <div className="mt-4">
          <PartyPicker
            title={`Who is this ${listing.noun} for?`}
            party={party}
            onChange={setParty}
            maxGuests={listing.maxGuests}
            minGuests={listing.minGuests}
            price={<PartyPrice listing={listing} party={party} nights={nights} />}
            confirmLabel={`Add ${listing.noun}`}
            onCancel={close}
            onConfirm={() => {
              onAdd(party);
              setAdded(true);
              close();
            }}
          />
        </div>
      )}
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
      <dl className="grid gap-3">
        {rows.map((row) => (
          <div key={row.label} className={`transition-opacity ${nights.length && row.nights === 0 ? "opacity-40" : ""}`}>
            <dt className="flex items-baseline justify-between gap-3 text-[0.82rem] text-bk-muted">
              {row.label}
              {nights.length > 0 && row.nights > 0 && <span className="text-bk-ink">{plural(row.nights, "night")}</span>}
            </dt>
            <dd>
              <span className="bk-display text-[1.6rem] leading-none tabular-nums">{formatRupees(row.rate.base)}</span>
              {row.rate.meals && <span className="mt-1 block text-[0.8rem] leading-snug text-bk-muted">{row.rate.meals}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {basis && <p className="mt-3 text-[0.8rem] text-bk-muted">{basisLabel(basis)}, a night, plus GST</p>}
    </div>
  );
}

/** The price of this listing for the party in the picker. */
function PartyPrice({ listing, party, nights }: { listing: Listing; party: Party; nights: string[] }) {
  if (listing.onRequest) return <span className="text-bk-muted">{listing.onRequest}</span>;
  if (nights.length > 0) {
    const total = priceForStay(listing, party, nights);
    return total === null ? (
      <span className="text-bk-muted">Our team confirms the rate for this party.</span>
    ) : (
      <span>
        <span className="bk-display text-[1.45rem] tabular-nums">{formatRupees(total)}</span>
        <span className="text-bk-muted"> for {plural(nights.length, "night")}, plus GST</span>
      </span>
    );
  }
  const rate = listing.everyNight ?? listing.weekday ?? listing.weekend;
  const night = rate ? priceForNight(rate, party) : null;
  return night === null ? (
    <span className="text-bk-muted">Choose dates to see the price.</span>
  ) : (
    <span>
      <span className="bk-display text-[1.45rem] tabular-nums">{formatRupees(night)}</span>
      <span className="text-bk-muted"> a night{listing.everyNight ? "" : ", Sun to Thu"}, plus GST</span>
    </span>
  );
}

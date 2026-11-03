"use client";

import { useEffect, useState } from "react";
import { formatDay, nightsOf, plural } from "./dates";
import { ListingCard } from "./listing-card";
import { describeParty, headcount, priceForStay } from "./pricing";
import { requestMessage, type RequestLine } from "./request";
import { addressFor, newKey, readSaved, searchFromAddress } from "./saved";
import { SearchBar, defaultSearch } from "./search-bar";
import { useSessionValue } from "./store";
import { Tray, TrayDock, useCheckout } from "./tray";
import type { Desk, Listing, ListingGroup, Party, Picked, StaySearch } from "./types";

type Plan = { search: StaySearch; items: Picked[] };

const emptyPlan: Plan = { search: defaultSearch, items: [] };

type StayPlannerProps = {
  groups: ListingGroup[];
  desk: Desk;
  /** Names this site's saved selection, such as "ks". */
  storageKey: string;
  /** The page's own address, for the search form, such as "/stays". */
  path: string;
  /** Small print under the tray: check-in times, offers, GST. */
  notes?: string[];
  imageSizes?: string;
};

/**
 * The booking page's working part, in the way MakeMyTrip does it: search by
 * dates and guests, add a room and say who stays in it, then add other
 * rooms of any type. The tray keeps the rooms, the guests still to place
 * and the estimate, and sends the request.
 */
export function StayPlanner({ groups, desk, storageKey, path, notes = [], imageSizes }: StayPlannerProps) {
  const listings = groups.flatMap((group) => group.listings);
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
  const [announcement, setAnnouncement] = useState("");
  const checkout = useCheckout();
  // The address wins, because it carries a search made a moment ago on the home page. Then this tab's saved plan.
  const [plan, setPlan] = useSessionValue<Plan>(`booking:${storageKey}:stay`, emptyPlan, () => {
    const saved = readSaved<Picked>(`booking:${storageKey}:stay`, (item) => byId.has(item.listingId));
    return { search: searchFromAddress(window.location.search) ?? saved.search ?? defaultSearch, items: saved.items };
  });
  const { search, items: picked } = plan;

  // A new search from the home page, made after this tab already saved one, replaces it.
  useEffect(() => {
    const fromAddress = searchFromAddress(window.location.search);
    if (fromAddress && JSON.stringify(fromAddress) !== JSON.stringify(plan.search)) setPlan({ search: fromAddress, items: plan.items });
    // Only when the page opens: later searches update the address and the plan together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nights = nightsOf(search.checkIn, search.checkOut);
  const pending = nights.length === 0;

  const lines: RequestLine[] = picked.flatMap((item) => {
    const listing = byId.get(item.listingId);
    return listing ? [{ key: item.key, title: listing.name, detail: describeParty(item.party), amount: priceForStay(listing, item.party, nights) }] : [];
  });
  const total = lines.some((line) => line.amount === null) ? null : lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  const placed = picked.reduce((sum, item) => sum + headcount(item.party), 0);
  const wanted = search.adults + search.children;
  const emptySlots = Array.from({ length: Math.max(0, search.rooms - picked.length) }, (_, i) => `Room ${picked.length + i + 1}`);

  /** Who the picker starts with: the adults and children still to place, spread over the rooms left. */
  function suggest(listing: Listing): Party {
    const placedAdults = picked.reduce((sum, item) => sum + item.party.adults, 0);
    const placedChildren = picked.reduce((sum, item) => sum + item.party.children5to11 + item.party.children3to5 + item.party.under3, 0);
    const roomsLeft = Math.max(1, search.rooms - picked.length);
    const adultsLeft = search.adults - placedAdults;
    let adults = adultsLeft > 0 ? Math.ceil(adultsLeft / roomsLeft) : 2;
    const most = listing.maxGuests ?? 60;
    adults = Math.min(most, Math.max(1, adults, listing.minGuests ?? 1));
    const childrenLeft = Math.max(0, search.children - placedChildren);
    const children = Math.min(Math.ceil(childrenLeft / roomsLeft), most - adults);
    return { adults, children5to11: Math.max(0, children), children3to5: 0, under3: 0 };
  }

  function add(listing: Listing, party: Party) {
    setPlan({ search, items: [...picked, { key: newKey(listing.id), listingId: listing.id, party }] });
    const nowPlaced = placed + headcount(party);
    setAnnouncement(
      `${listing.name} added for ${describeParty(party)}.${wanted > nowPlaced ? ` ${wanted - nowPlaced} guests still need a room.` : ""}`,
    );
    checkout.setStep("pick");
  }

  function remove(itemKey: string) {
    const item = picked.find((p) => p.key === itemKey);
    setPlan({ search, items: picked.filter((p) => p.key !== itemKey) });
    if (item) setAnnouncement(`${byId.get(item.listingId)?.name ?? "Room"} removed.`);
  }

  function applySearch(next: StaySearch) {
    setPlan({ search: next, items: picked });
    window.history.replaceState(null, "", `${addressFor(next)}${window.location.hash}`);
    setAnnouncement(`Prices now show ${plural(nightsOf(next.checkIn, next.checkOut).length, "night")}, from ${formatDay(next.checkIn)}.`);
  }

  const when = pending ? (
    <a href="#book" className="underline underline-offset-4">
      Choose your dates
    </a>
  ) : (
    <>
      {formatDay(search.checkIn)} to {formatDay(search.checkOut)} · {plural(nights.length, "night")}{" "}
      <a href="#book" className="ml-1 text-bk-ink underline underline-offset-4">
        Change
      </a>
    </>
  );

  const blocker = picked.length === 0 ? "Add a room to continue." : pending ? "Choose your dates above to continue." : null;

  const tray = (
    <Tray
      heading="Your stay"
      when={when}
      lines={lines}
      emptySlots={emptySlots}
      onRemove={remove}
      coverage={{ placed, wanted }}
      total={total}
      pending={pending}
      notes={notes}
      blocker={blocker}
      desk={desk}
      checkout={checkout}
      message={(guest) =>
        requestMessage({
          desk,
          opening: "I would like to book a stay.",
          when: [`Check-in: ${formatDay(search.checkIn)}`, `Check-out: ${formatDay(search.checkOut)} (${plural(nights.length, "night")})`],
          lines,
          total,
          guest,
        })
      }
    />
  );

  return (
    <div className="pb-28 lg:pb-0">
      <div id="book" className="scroll-mt-28">
        <SearchBar key={JSON.stringify(search)} action={path} value={search} onSearch={applySearch} submitLabel={pending ? "Check prices" : "Update"} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start xl:gap-12">
        <div className="grid gap-14">
          {groups.map((group) => (
            <section key={group.id} id={group.id} aria-labelledby={`group-${group.id}`} className="scroll-mt-28">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-bk-line pb-4">
                <h2 id={`group-${group.id}`} className="bk-display text-[2rem] sm:text-[2.4rem]">
                  {group.title}
                </h2>
                {group.line && <p className="max-w-md text-[0.92rem] text-bk-muted">{group.line}</p>}
              </div>
              <div className="mt-5 grid gap-4">
                {group.listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    nights={nights}
                    count={picked.filter((item) => item.listingId === listing.id).length}
                    suggested={suggest(listing)}
                    onAdd={(party) => add(listing, party)}
                    imageSizes={imageSizes}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside aria-label="Your selection" className="hidden lg:sticky lg:top-[calc(var(--bk-sticky-top)+1rem)] lg:block">
          <div data-lenis-prevent className="max-h-[calc(100svh-var(--bk-sticky-top)-2rem)] overflow-y-auto overscroll-contain rounded-bk border border-bk-line bg-bk-card p-6">
            {tray}
          </div>
        </aside>
      </div>

      <TrayDock summary={picked.length ? plural(picked.length, "room") + ` · ${plural(placed, "guest")}` : "No rooms added yet"} total={pending || picked.length === 0 ? null : total}>
        {tray}
      </TrayDock>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

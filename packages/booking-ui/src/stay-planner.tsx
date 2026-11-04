"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, pickStay, type Choosing } from "./calendar";
import { useToday } from "./date-field";
import { formatDay, formatRange, nightsOf, plural } from "./dates";
import { ListingCard, PartyPrice } from "./listing-card";
import { PickDialog } from "./pick-dialog";
import { PlannerNav } from "./planner-nav";
import { describeParty, formatRupees, headcount, priceForStay } from "./pricing";
import { requestMessage, type RequestLine } from "./request";
import { addressFor, newKey, readSaved, searchFromAddress } from "./saved";
import { SearchBar, defaultSearch } from "./search-bar";
import { Sheet } from "./sheet";
import { Steps } from "./steps";
import { useSessionValue } from "./store";
import { Tray, TrayDock, useCheckout } from "./tray";
import type { Desk, Listing, ListingGroup, Party, Picked, StaySearch } from "./types";

type Plan = { search: StaySearch; items: Picked[] };

const emptyPlan: Plan = { search: defaultSearch, items: [] };

/** The listing in the panel, who is in it, and, when changing a line already added, that line's key. */
type Picking = { listingId: string; party: Party; key?: string };

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
  const navItems = useMemo(() => groups.flatMap((group) => group.listings.map((listing) => ({ id: listing.id, label: listing.name }))), [groups]);
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

  // The panels: adding or changing a room, the phone tray, and dates and guests.
  const [picking, setPicking] = useState<Picking | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickCount, setPickCount] = useState(0);
  const [trayOpen, setTrayOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);

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

  /** Who the panel starts with: the adults and children still to place, spread over the rooms left. */
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

  function openPick(next: Picking) {
    setPicking(next);
    setPickCount((n) => n + 1);
    setPickOpen(true);
  }

  function confirmPick() {
    const listing = picking && byId.get(picking.listingId);
    if (!picking || !listing) return;
    if (picking.key) {
      setPlan({ search, items: picked.map((item) => (item.key === picking.key ? { ...item, party: picking.party } : item)) });
      setAnnouncement(`${listing.name} is now for ${describeParty(picking.party)}.`);
    } else {
      const key = newKey(listing.id);
      setPlan({ search, items: [...picked, { key, listingId: listing.id, party: picking.party }] });
      setFresh(key);
      const left = wanted - placed - headcount(picking.party);
      setAnnouncement(`${listing.name} added for ${describeParty(picking.party)}.${left > 0 ? ` ${left === 1 ? "1 guest still needs" : `${left} guests still need`} a room.` : ""}`);
    }
    checkout.setStep("pick");
    setPickOpen(false);
  }

  function remove(itemKey: string) {
    const item = picked.find((p) => p.key === itemKey);
    setPlan({ search, items: picked.filter((p) => p.key !== itemKey) });
    if (item) setAnnouncement(`${byId.get(item.listingId)?.name ?? "Room"} removed.`);
  }

  function applySearch(next: StaySearch) {
    setPlan({ search: next, items: picked });
    window.history.replaceState(null, "", `${addressFor(next)}${window.location.hash}`);
    const count = nightsOf(next.checkIn, next.checkOut).length;
    if (count) setAnnouncement(`Prices now show ${plural(count, "night")}, from ${formatDay(next.checkIn)}.`);
  }

  const changeDates = () => setSearchOpen(true);

  const when = pending ? (
    <button type="button" onClick={changeDates} className="text-bk-ink underline underline-offset-4">
      Choose your dates
    </button>
  ) : (
    <>
      {formatDay(search.checkIn)} to {formatDay(search.checkOut)} · {plural(nights.length, "night")}{" "}
      <button type="button" onClick={changeDates} className="ml-1 text-bk-ink underline underline-offset-4">
        Change
      </button>
    </>
  );

  const blocker = picked.length === 0 ? "Add a room to continue." : pending ? "Choose your dates to continue." : null;

  const tray = (
    <Tray
      heading="Your stay"
      when={when}
      lines={lines}
      emptySlots={emptySlots}
      onRemove={remove}
      onEdit={(itemKey) => {
        const item = picked.find((p) => p.key === itemKey);
        if (item) openPick({ listingId: item.listingId, party: item.party, key: item.key });
      }}
      fresh={fresh}
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

  const pickedListing = picking ? byId.get(picking.listingId) : undefined;
  const lineIndex = picking?.key ? picked.findIndex((item) => item.key === picking.key) : -1;
  const slot = lineIndex >= 0 ? lineIndex + 1 : picked.length + 1;
  const eyebrow = picking?.key
    ? `Room ${slot} in your stay`
    : search.rooms > 1 && slot <= search.rooms
      ? `Room ${slot} of ${search.rooms}`
      : `Room ${slot}`;

  const guests = search.adults + search.children;
  const summary = pending ? "" : `${formatRange(search.checkIn, search.checkOut)} · ${plural(guests, "guest")}`;
  const dockSummary = `${plural(picked.length, "room")} · ${placed < wanted ? `${placed} of ${plural(wanted, "guest")} placed` : plural(placed, "guest")}`;
  const dockTotal = pending ? "Add dates for the price" : total === null ? "Price to confirm" : `${formatRupees(total)} + GST`;

  return (
    <div className="pb-28 lg:pb-0">
      <div id="book" className="scroll-mt-28">
        <Steps
          steps={[
            { label: "Choose dates", done: !pending },
            { label: "Add rooms and guests", done: picked.length > 0 && placed >= wanted },
            { label: "Send the request on WhatsApp", done: checkout.step === "sent" },
          ]}
        />
        <SearchBar action={path} value={search} onSearch={applySearch} className="mt-4" />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start xl:gap-12">
        <div className="min-w-0">
          <PlannerNav summary={summary} onSummary={changeDates} items={navItems} />
          <div className="mt-8 grid gap-14">
            {groups.map((group) => (
              <section key={group.id} id={group.id} aria-labelledby={`group-${group.id}`} className="scroll-mt-[calc(var(--bk-sticky-top)+5rem)]">
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
                      onPick={() => openPick({ listingId: listing.id, party: suggest(listing) })}
                      imageSizes={imageSizes}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside aria-label="Your selection" className="hidden lg:sticky lg:top-[calc(var(--bk-sticky-top)+1rem)] lg:block">
          <div data-lenis-prevent className="max-h-[calc(100svh-var(--bk-sticky-top)-2rem)] overflow-y-auto overscroll-contain rounded-bk border border-bk-line bg-bk-card p-6">
            {tray}
          </div>
        </aside>
      </div>

      <TrayDock summary={dockSummary} total={dockTotal} visible={picked.length > 0} open={trayOpen} onOpenChange={setTrayOpen}>
        {tray}
      </TrayDock>

      {picking && pickedListing && (
        <PickDialog
          open={pickOpen}
          onClose={() => setPickOpen(false)}
          eyebrow={eyebrow}
          name={pickedListing.name}
          photo={pickedListing.photos[0]}
          when={<StayDates key={pickCount} search={search} onChange={applySearch} />}
          question="Who is staying?"
          party={picking.party}
          onParty={(party) => setPicking({ ...picking, party })}
          maxGuests={pickedListing.maxGuests}
          minGuests={pickedListing.minGuests}
          price={<PartyPrice listing={pickedListing} party={picking.party} nights={nights} />}
          confirmLabel={picking.key ? "Save" : `Add ${pickedListing.noun}`}
          onConfirm={confirmPick}
        />
      )}

      <Sheet open={searchOpen} onClose={() => setSearchOpen(false)} label="Dates and guests" center>
        <h2 data-autofocus tabIndex={-1} className="bk-display pr-10 outline-none text-[1.6rem]">Dates and guests</h2>
        <p className="mt-1 text-[0.9rem] text-bk-muted">Prices on the page change as you choose.</p>
        <SearchBar action={path} value={search} onSearch={applySearch} stacked className="mt-5" />
        <button
          type="button"
          onClick={() => setSearchOpen(false)}
          className="mt-4 min-h-12 w-full rounded-bk-control bg-bk-accent px-6 bk-button text-bk-accent-ink transition-opacity hover:opacity-90"
        >
          Done
        </button>
      </Sheet>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/**
 * The stay's dates in the panel: a line with "Change", or the calendar when
 * there are no dates yet. The prices change once both dates are chosen.
 */
function StayDates({ search, onChange }: { search: StaySearch; onChange: (search: StaySearch) => void }) {
  const today = useToday();
  const nights = nightsOf(search.checkIn, search.checkOut);
  const [editing, setEditing] = useState(nights.length === 0);
  const [dates, setDates] = useState({ checkIn: search.checkIn, checkOut: search.checkOut });
  const [choosing, setChoosing] = useState<Choosing>("start");

  if (!editing && nights.length > 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[calc(var(--bk-radius)*0.6)] bg-bk-soft px-4 py-3 text-[0.92rem]">
        <span>
          {formatDay(search.checkIn)} to {formatDay(search.checkOut)} · {plural(nights.length, "night")}
        </span>
        <button type="button" onClick={() => setEditing(true)} className="min-h-10 shrink-0 text-bk-ink underline underline-offset-4">
          Change
        </button>
      </div>
    );
  }

  function pick(date: string) {
    const picked = pickStay(dates, choosing, date);
    setDates(picked.dates);
    if (nightsOf(picked.dates.checkIn, picked.dates.checkOut).length) onChange({ ...search, ...picked.dates });
    if (picked.next === "done") {
      setEditing(false);
      setChoosing("start");
    } else setChoosing(picked.next);
  }

  return (
    <div className="rounded-bk border border-bk-line px-3 pb-3 pt-3">
      <Calendar start={dates.checkIn} end={dates.checkOut} choosing={choosing} onChoose={setChoosing} min={today || undefined} weekendNights onPick={pick} />
    </div>
  );
}

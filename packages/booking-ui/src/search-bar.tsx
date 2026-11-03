"use client";

import Form from "next/form";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { addDays, plural, todayInIndia } from "./dates";
import { Stepper } from "./stepper";
import type { StaySearch } from "./types";

export const defaultSearch: StaySearch = { checkIn: "", checkOut: "", rooms: 1, adults: 2, children: 0 };

/** The query string a search travels in, from the home page to the rooms page. */
export const searchParamNames = { checkIn: "in", checkOut: "out", rooms: "rooms", adults: "adults", children: "children" } as const;

type SearchBarProps = {
  /** The rooms page. Without `onSearch`, the form goes there with the search in its address. */
  action: string;
  value?: StaySearch;
  /** On the rooms page itself: update the prices in place instead of loading a page. */
  onSearch?: (search: StaySearch) => void;
  submitLabel?: string;
  className?: string;
};

const noop = () => () => {};

/** Today's date in India, once the page runs in the browser. Empty while prerendering. */
const useToday = () => useSyncExternalStore(noop, () => todayInIndia(), () => "");

const cell = "relative flex min-h-[4.25rem] flex-col justify-center px-4 py-2.5";
const label = "text-[0.78rem] leading-none text-bk-muted";
const input = "mt-1.5 w-full min-w-0 appearance-none bg-transparent text-[1rem] leading-tight text-bk-ink outline-none [color-scheme:light]";

/**
 * Dates, rooms and guests in one bar, as on every booking site. It is a
 * plain form, so it works before scripts load and without them.
 */
export function SearchBar({ action, value = defaultSearch, onSearch, submitLabel = "Check availability", className = "" }: SearchBarProps) {
  const id = useId();
  const today = useToday();
  const [draft, setDraft] = useState<StaySearch>(value);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);

  // Close the guests panel on a click outside it or on Escape.
  useEffect(() => {
    if (!guestsOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!guestsRef.current?.contains(event.target as Node)) setGuestsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setGuestsOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [guestsOpen]);

  const set = (patch: Partial<StaySearch>) => setDraft((current) => ({ ...current, ...patch }));
  const setCheckIn = (checkIn: string) =>
    set({ checkIn, checkOut: checkIn && (!draft.checkOut || draft.checkOut <= checkIn) ? addDays(checkIn, 1) : draft.checkOut });

  const guestsLine = `${plural(draft.rooms, "room")} · ${plural(draft.adults, "adult")}${draft.children ? ` · ${plural(draft.children, "child", "children")}` : ""}`;

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!onSearch) return;
    event.preventDefault();
    setGuestsOpen(false);
    onSearch(draft);
  }

  const frame = `grid grid-cols-2 rounded-bk border border-bk-line bg-bk-card text-bk-ink shadow-[0_12px_40px_-24px_rgb(0_0_0/0.4)] md:grid-cols-[1fr_1fr_1.25fr_auto] ${className}`;

  const fields = (
    <>
      <label className={`${cell} border-b border-r border-bk-line md:border-b-0`}>
        <span className={label}>Check-in</span>
        <input
          type="date"
          name={searchParamNames.checkIn}
          required
          min={today || undefined}
          value={draft.checkIn}
          onChange={(event) => setCheckIn(event.target.value)}
          className={input}
        />
      </label>
      <label className={`${cell} border-b border-bk-line md:border-b-0 md:border-r`}>
        <span className={label}>Check-out</span>
        <input
          type="date"
          name={searchParamNames.checkOut}
          required
          min={draft.checkIn ? addDays(draft.checkIn, 1) : today || undefined}
          value={draft.checkOut}
          onChange={(event) => set({ checkOut: event.target.value })}
          className={input}
        />
      </label>

      <div ref={guestsRef} className={`${cell} col-span-2 border-b border-bk-line md:col-span-1 md:border-b-0 md:border-r`}>
        <span id={`${id}-guests`} className={label}>
          Rooms and guests
        </span>
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={guestsOpen}
          aria-controls={`${id}-panel`}
          aria-describedby={`${id}-guests`}
          onClick={() => setGuestsOpen((open) => !open)}
          className="mt-1.5 flex w-full items-center justify-between gap-3 text-left text-[1rem] leading-tight after:absolute after:inset-0"
        >
          <span className="truncate">{guestsLine}</span>
          <span aria-hidden className={`text-[0.8rem] text-bk-muted transition-transform ${guestsOpen ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
        <input type="hidden" name={searchParamNames.rooms} value={draft.rooms} />
        <input type="hidden" name={searchParamNames.adults} value={draft.adults} />
        <input type="hidden" name={searchParamNames.children} value={draft.children} />
        {guestsOpen && (
          <div
            id={`${id}-panel`}
            className="absolute inset-x-0 top-full z-30 mt-2 rounded-bk border border-bk-line bg-bk-card p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.4)] md:left-auto md:w-[22rem]"
          >
            <div className="divide-y divide-bk-line">
              <Stepper label="Rooms" value={draft.rooms} min={1} max={Math.min(20, draft.adults)} onChange={(rooms) => set({ rooms })} />
              <Stepper label="Adults" hint="12 and over" value={draft.adults} min={draft.rooms} max={60} onChange={(adults) => set({ adults })} />
              <Stepper label="Children" hint="Under 12" value={draft.children} min={0} max={30} onChange={(children) => set({ children })} />
            </div>
            <button
              type="button"
              onClick={() => setGuestsOpen(false)}
              className="mt-3 min-h-11 w-full rounded-bk-control border border-bk-line bk-button hover:border-bk-ink"
            >
              Done
            </button>
          </div>
        )}
      </div>

      <div className="col-span-2 p-2 md:col-span-1">
        <button
          type="submit"
          className="flex h-full min-h-12 w-full items-center justify-center rounded-[max(0px,calc(var(--bk-radius)-0.35rem))] bg-bk-accent px-6 bk-button text-bk-accent-ink transition-opacity hover:opacity-90"
        >
          {submitLabel}
        </button>
      </div>
    </>
  );

  // On the rooms page, update in place. Elsewhere, go to the rooms page without a full reload.
  return onSearch ? (
    <form onSubmit={submit} aria-label="Check availability" className={frame}>
      {fields}
    </form>
  ) : (
    <Form action={action} aria-label="Check availability" className={frame}>
      {fields}
    </Form>
  );
}

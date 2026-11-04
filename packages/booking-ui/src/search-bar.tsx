"use client";

import Form from "next/form";
import { useId, useRef, useState, type FormEvent } from "react";
import { Calendar, pickStay, type Choosing, type StayDates } from "./calendar";
import { DateButton, Popover, useDismiss } from "./date-field";
import { nightsOf, plural } from "./dates";
import { searchParamNames } from "./params";
import { Stepper } from "./stepper";
import type { StaySearch } from "./types";
import { useToday, useWide } from "./use-today";

export const defaultSearch: StaySearch = { checkIn: "", checkOut: "", rooms: 1, adults: 2, children: 0 };

type SearchBarProps = {
  /** The rooms page. Without `onSearch`, the form goes there with the search in its address. */
  action: string;
  value?: StaySearch;
  /** On the rooms page itself: every change applies at once, and the bar has no button. */
  onSearch?: (search: StaySearch) => void;
  submitLabel?: string;
  /** In a narrow panel: the calendar and the guests show in place, not in pop-ups. */
  stacked?: boolean;
  className?: string;
};

const cell = "relative flex min-h-[4.25rem] flex-col justify-center px-4 py-2.5";
const label = "text-[0.78rem] leading-none text-bk-muted";

/**
 * Dates, rooms and guests in one bar, as on every booking site. Either date
 * opens the calendar, which asks for check-in, then check-out. On the rooms
 * page every change applies at once; elsewhere it is a plain form that goes
 * to the rooms page, and works before scripts load. It lays itself out by
 * its own width, so it fits a page and a narrow panel alike.
 */
export function SearchBar({ action, value = defaultSearch, onSearch, submitLabel = "Check availability", stacked = false, className = "" }: SearchBarProps) {
  const id = useId();
  const today = useToday();
  const wide = useWide();
  // On the rooms page ("live"), the page's own search is the state. Elsewhere the form keeps a draft until it is sent.
  const live = onSearch !== undefined;
  const [draft, setDraft] = useState<StaySearch>(value);
  const current = live ? value : draft;
  // Live: a check-in chosen without its check-out yet. The page keeps its dates until both are chosen.
  const [pending, setPending] = useState<StayDates | null>(null);
  const dates = pending ?? { checkIn: current.checkIn, checkOut: current.checkOut };
  const [guestsOpen, setGuestsOpen] = useState(false);
  // Which date the next tap on the calendar sets. In the bar, empty means the calendar is closed.
  const [choosing, setChoosing] = useState<Choosing | "">(stacked ? "start" : "");
  // Set when the guest sends the form without dates.
  const [missing, setMissing] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);
  const guestsButtonRef = useRef<HTMLButtonElement>(null);
  const datesRef = useRef<HTMLDivElement>(null);
  const checkInRef = useRef<HTMLButtonElement>(null);

  const apply = (next: StaySearch) => (onSearch ? onSearch(next) : setDraft(next));
  const set = (patch: Partial<StaySearch>) => apply({ ...current, ...patch });

  // Closing the calendar half-way keeps the dates the page already has.
  const closeCalendar = () => {
    setChoosing("");
    setPending(null);
  };
  useDismiss(guestsOpen, guestsRef, () => setGuestsOpen(false), guestsButtonRef);
  useDismiss(!stacked && choosing !== "", datesRef, closeCalendar, checkInRef);

  function pickDate(date: string) {
    const picked = pickStay(dates, choosing || "start", date);
    const complete = nightsOf(picked.dates.checkIn, picked.dates.checkOut).length > 0;
    setMissing(false);
    if (live && !complete) setPending(picked.dates);
    else {
      setPending(null);
      apply({ ...current, ...picked.dates });
    }
    if (picked.next !== "done") setChoosing(picked.next);
    else if (stacked) setChoosing("start");
    else {
      setChoosing("");
      guestsButtonRef.current?.focus({ preventScroll: true });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!current.checkIn || !current.checkOut) {
      event.preventDefault();
      setMissing(true);
      setGuestsOpen(false);
      setChoosing(current.checkIn ? "end" : "start");
      return;
    }
    if (!live) return;
    event.preventDefault();
    setGuestsOpen(false);
  }

  const guestsLine = `${plural(current.rooms, "room")} · ${plural(current.adults, "adult")}${current.children ? ` · ${plural(current.children, "child", "children")}` : ""}`;

  const steppers = (
    <div className="divide-y divide-bk-line">
      <Stepper label="Rooms" value={current.rooms} min={1} max={Math.min(20, current.adults)} onChange={(rooms) => set({ rooms })} />
      <Stepper label="Adults" hint="12 and over" value={current.adults} min={current.rooms} max={60} onChange={(adults) => set({ adults })} />
      <Stepper label="Children" hint="Under 12" value={current.children} min={0} max={30} onChange={(children) => set({ children })} />
    </div>
  );

  const calendar = (
    <>
      {missing && (
        <p role="alert" className="mb-3 text-[0.9rem] text-bk-alert">
          Choose your check-in and check-out dates first.
        </p>
      )}
      <Calendar
        start={dates.checkIn}
        end={dates.checkOut}
        choosing={choosing || "start"}
        onChoose={setChoosing}
        min={today || undefined}
        months={!stacked && wide ? 2 : 1}
        weekendNights
        autoFocus={!stacked}
        onPick={pickDate}
        actions={
          (dates.checkIn || !stacked) && (
            <>
              {dates.checkIn && (
                <button
                  type="button"
                  onClick={() => {
                    setPending(null);
                    set({ checkIn: "", checkOut: "" });
                    setChoosing("start");
                  }}
                  className="min-h-10 px-2 text-bk-muted underline underline-offset-4 hover:text-bk-ink"
                >
                  Clear dates
                </button>
              )}
              {!stacked && (
                <button
                  type="button"
                  onClick={closeCalendar}
                  className="min-h-10 rounded-bk-control bg-bk-accent px-5 bk-button text-bk-accent-ink transition-opacity hover:opacity-90"
                >
                  Done
                </button>
              )}
            </>
          )
        }
      />
    </>
  );

  const hidden = (
    <>
      <input type="hidden" name={searchParamNames.checkIn} value={current.checkIn} />
      <input type="hidden" name={searchParamNames.checkOut} value={current.checkOut} />
      <input type="hidden" name={searchParamNames.rooms} value={current.rooms} />
      <input type="hidden" name={searchParamNames.adults} value={current.adults} />
      <input type="hidden" name={searchParamNames.children} value={current.children} />
    </>
  );

  const frame = `relative grid grid-cols-2 rounded-bk border bg-bk-card text-bk-ink shadow-[0_12px_40px_-24px_rgb(0_0_0/0.4)] ${
    missing ? "border-bk-alert" : "border-bk-line"
  } ${stacked ? "" : live ? "@2xl:grid-cols-[2fr_1.25fr]" : "@2xl:grid-cols-[2fr_1.25fr_auto]"}`;

  const fields = (
    <>
      {hidden}
      <div ref={datesRef} className={`relative col-span-2 border-b border-bk-line ${stacked ? "" : "@2xl:col-span-1 @2xl:border-b-0 @2xl:border-r"}`}>
        {stacked ? (
          <div className="px-3 pb-3 pt-3">{calendar}</div>
        ) : (
          <>
            <div className="grid grid-cols-2">
              <DateButton
                ref={checkInRef}
                label="Check-in"
                value={dates.checkIn}
                active={choosing === "start"}
                onClick={() => (choosing === "start" ? closeCalendar() : setChoosing("start"))}
                className="rounded-tl-[calc(var(--bk-radius)-1px)] border-r border-bk-line @2xl:rounded-bl-[calc(var(--bk-radius)-1px)]"
              />
              <DateButton
                label="Check-out"
                value={dates.checkOut}
                placeholder={choosing === "end" ? "Select a date" : "Add date"}
                active={choosing === "end"}
                onClick={() => (choosing === "end" ? closeCalendar() : setChoosing(dates.checkIn ? "end" : "start"))}
                className="rounded-tr-[calc(var(--bk-radius)-1px)] @2xl:rounded-tr-none"
              />
            </div>
            {choosing && (
              <Popover label="Choose your dates" className={`left-0 ${wide ? "w-[min(44rem,calc(100vw-3rem))]" : "w-full"}`}>
                {calendar}
              </Popover>
            )}
          </>
        )}
      </div>

      {stacked ? (
        <fieldset className="col-span-2 border-b border-bk-line px-4 pb-1 pt-3">
          <legend className={`${label} float-left`}>Rooms and guests</legend>
          <div className="clear-left pt-1">{steppers}</div>
        </fieldset>
      ) : (
        <div ref={guestsRef} className={`${cell} col-span-2 border-bk-line @2xl:col-span-1 @2xl:border-b-0 ${live ? "" : "border-b @2xl:border-r"}`}>
          <span id={`${id}-guests`} className={label}>
            Rooms and guests
          </span>
          <button
            ref={guestsButtonRef}
            type="button"
            aria-haspopup="true"
            aria-expanded={guestsOpen}
            aria-controls={`${id}-panel`}
            aria-describedby={`${id}-guests`}
            onClick={() => {
              setChoosing("");
              setGuestsOpen((open) => !open);
            }}
            className="mt-1.5 flex w-full items-center justify-between gap-3 text-left text-[1rem] leading-tight after:absolute after:inset-0"
          >
            <span className="truncate">{guestsLine}</span>
            <span aria-hidden className={`text-[0.8rem] text-bk-muted transition-transform ${guestsOpen ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>
          {guestsOpen && (
            <div
              id={`${id}-panel`}
              className="bk-pop absolute inset-x-0 top-full z-40 mt-2 rounded-bk border border-bk-line bg-bk-card p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.4)] @2xl:left-auto @2xl:w-[22rem]"
            >
              {steppers}
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
      )}

      {!live && (
        <div className={`col-span-2 p-2 ${stacked ? "" : "@2xl:col-span-1"}`}>
          <button
            type="submit"
            className="flex h-full min-h-12 w-full items-center justify-center rounded-[max(0px,calc(var(--bk-radius)-0.35rem))] bg-bk-accent px-6 bk-button text-bk-accent-ink transition-opacity hover:opacity-90"
          >
            {submitLabel}
          </button>
        </div>
      )}
    </>
  );

  // On the rooms page, update in place. Elsewhere, go to the rooms page without a full reload.
  return (
    <div className={`@container ${className}`}>
      {live ? (
        <form onSubmit={submit} aria-label="Check availability" className={frame}>
          {fields}
        </form>
      ) : (
        <Form action={action} onSubmit={submit} aria-label="Check availability" className={frame}>
          {fields}
        </Form>
      )}
    </div>
  );
}

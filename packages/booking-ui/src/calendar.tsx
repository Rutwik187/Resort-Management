"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { addDays, addMonths, formatDay, formatLong, formatMonth, monthOf, monthWeeks, nightsOf, plural, sameDayIn, weekdayOf } from "./dates";
import { useToday } from "./use-today";

/** Which date the next tap sets: check-in ("start") or check-out ("end"). */
export type Choosing = "start" | "end";

export type StayDates = { checkIn: string; checkOut: string };

/**
 * What a tap on a day does to a stay. While choosing check-out, a later day
 * ends the stay. Any other tap makes that day check-in: the old check-out
 * stays when it still fits, and the guest chooses check-out next.
 */
export function pickStay(dates: StayDates, choosing: Choosing, date: string, maxNights = 30): { dates: StayDates; next: Choosing | "done" } {
  if (choosing === "end" && dates.checkIn && date > dates.checkIn && date <= addDays(dates.checkIn, maxNights)) {
    return { dates: { ...dates, checkOut: date }, next: "done" };
  }
  const keep = dates.checkOut > date && dates.checkOut <= addDays(date, maxNights);
  return { dates: { checkIn: date, checkOut: keep ? dates.checkOut : "" }, next: "end" };
}

type CalendarProps = {
  /** The chosen day, or check-in for a stay. Empty until chosen. */
  start: string;
  /** Check-out, for a stay. Leave it out to choose a single day. */
  end?: string;
  /** For a stay: which date the next tap sets. */
  choosing?: Choosing;
  /** The first day that can be chosen, usually today. */
  min?: string;
  /** The most nights in one stay. */
  maxNights?: number;
  /** Months side by side: 2 on wide screens. */
  months?: 1 | 2;
  /** Marks Fridays and Saturdays, whose nights take the weekend rate. */
  weekendNights?: boolean;
  /** Moves focus to the chosen day when the calendar appears. */
  autoFocus?: boolean;
  onPick: (date: string) => void;
  /** Buttons for the foot of the calendar, such as "Done". */
  actions?: ReactNode;
};

const weekdays = [
  ["Su", "Sunday"],
  ["Mo", "Monday"],
  ["Tu", "Tuesday"],
  ["We", "Wednesday"],
  ["Th", "Thursday"],
  ["Fr", "Friday"],
  ["Sa", "Saturday"],
] as const;

/**
 * A month calendar for one day or for a stay, drawn in the site's own colours.
 * For a stay, check-in and check-out are filled and the nights between are
 * shaded; while the guest chooses check-out, the stay follows the pointer.
 * Arrow keys move by day and week, Page Up and Page Down by month.
 */
export function Calendar({ start, end, choosing = "start", min, maxNights = 30, months = 1, weekendNights = false, autoFocus = false, onPick, actions }: CalendarProps) {
  const id = useId();
  const today = useToday();
  const first = min || today;
  const stay = end !== undefined;
  const choosingEnd = stay && choosing === "end" && start !== "";
  const lastEnd = choosingEnd ? addDays(start, maxNights) : "";
  // Eighteen months to choose from.
  const last = first ? addDays(addMonths(first, 18), -1) : "";

  const initial = (choosingEnd ? end || addDays(start, 1) : start) || first;
  // Empty until the guest moves, so the calendar follows the dates it is given until then.
  const [viewState, setView] = useState("");
  const [focusState, setFocus] = useState("");
  const [hover, setHover] = useState("");
  const view = viewState || (initial ? monthOf(initial) : "");
  const focus = focusState || initial;
  const gridRef = useRef<HTMLDivElement>(null);
  const keyboard = useRef(false);

  useEffect(() => {
    if (autoFocus) gridRef.current?.querySelector<HTMLElement>("[data-date][tabindex='0']")?.focus({ preventScroll: true });
  }, [autoFocus]);

  // After a key moves the focus, follow it with the browser's focus.
  useEffect(() => {
    if (!keyboard.current) return;
    keyboard.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${focus}"]`)?.focus();
  }, [focus, view]);

  if (!view) return null;

  const shown = Array.from({ length: months }, (_, i) => addMonths(view, i));
  const afterShown = addMonths(view, months);
  const canBack = !first || view > monthOf(first);
  const canForward = !last || afterShown <= last;
  const blocked = (date: string) => (first !== "" && date < first) || (last !== "" && date > last) || (choosingEnd && date > lastEnd);
  const tabbable = focus >= view && focus < afterShown ? focus : first > view && first < afterShown ? first : view;

  const previewEnd = choosingEnd && hover > start && hover <= lastEnd ? hover : "";
  const shownEnd = previewEnd || (end && end > start ? end : "");

  function move(next: string) {
    const date = first && next < first ? first : last && next > last ? last : next;
    keyboard.current = true;
    setFocus(date);
    const month = monthOf(date);
    if (month < view) setView(month);
    else if (month >= afterShown) setView(addMonths(month, 1 - months));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const from = (event.target as HTMLElement).dataset.date;
    if (!from) return;
    const steps: Record<string, string> = {
      ArrowLeft: addDays(from, -1),
      ArrowRight: addDays(from, 1),
      ArrowUp: addDays(from, -7),
      ArrowDown: addDays(from, 7),
      Home: addDays(from, -weekdayOf(from)),
      End: addDays(from, 6 - weekdayOf(from)),
      PageUp: sameDayIn(addMonths(from, -1), from),
      PageDown: sameDayIn(addMonths(from, 1), from),
    };
    const next = steps[event.key];
    if (!next) return;
    event.preventDefault();
    move(next);
  }

  function pick(date: string) {
    if (blocked(date)) return;
    setFocus(date);
    setHover("");
    onPick(date);
  }

  const status = !stay
    ? null
    : !start
      ? "Choose your check-in date."
      : choosingEnd && !shownEnd
        ? `Check-in ${formatDay(start)}. Now choose check-out, up to ${maxNights} nights later.`
        : shownEnd
          ? `${formatDay(start)} to ${formatDay(shownEnd)} · ${plural(nightsOf(start, shownEnd).length, "night")}`
          : `Check-in ${formatDay(start)}.`;

  return (
    <div className="text-bk-ink">
      <div className="relative">
        <div ref={gridRef} onKeyDown={onKeyDown} onMouseLeave={() => setHover("")} className={`grid gap-x-8 gap-y-5 ${months === 2 ? "grid-cols-2" : ""}`}>
          {shown.map((month, i) => (
            <div key={month} className="min-w-0">
              <h3 id={`${id}-${month}`} aria-live={i === 0 ? "polite" : undefined} className="bk-display flex h-11 items-center justify-center text-[1.15rem]">
                {formatMonth(month)}
              </h3>
              <table role="grid" aria-labelledby={`${id}-${month}`} className="mt-1 w-full table-fixed border-collapse">
                <thead>
                  <tr>
                    {weekdays.map(([short, long], day) => (
                      <th
                        key={short}
                        scope="col"
                        abbr={long}
                        className={`pb-1.5 text-[0.75rem] font-medium ${weekendNights && day >= 5 ? "text-bk-alert" : "text-bk-muted"}`}
                      >
                        {short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthWeeks(month).map((week, row) => (
                    <tr key={row}>
                      {week.map((date, day) => {
                        if (!date) return <td key={day} />;
                        const isStart = date === start;
                        const isEnd = stay && date === shownEnd;
                        const between = stay && start !== "" && shownEnd !== "" && date > start && date < shownEnd;
                        const off = blocked(date);
                        const weekend = weekendNights && day >= 5;
                        const chosen = isStart || isEnd;
                        const band = between ? "bk-band" : isStart && shownEnd ? "bk-band-start" : isEnd && start ? "bk-band-end" : "";
                        return (
                          <td key={day} role="gridcell" aria-selected={chosen || between} className={`p-0 py-0.5 ${band}`}>
                            <button
                              type="button"
                              data-date={date}
                              tabIndex={date === tabbable ? 0 : -1}
                              aria-disabled={off || undefined}
                              aria-label={`${formatLong(date)}${stay && isStart ? ", check-in" : ""}${isEnd ? ", check-out" : ""}${date === today ? ", today" : ""}${weekend ? ", weekend rate" : ""}`}
                              onClick={() => pick(date)}
                              onMouseEnter={() => choosingEnd && setHover(date)}
                              className={`relative mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-bk-control text-[0.95rem] tabular-nums outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-bk-ink ${
                                chosen
                                  ? "bg-bk-accent font-semibold text-bk-accent-ink"
                                  : off
                                    ? "cursor-not-allowed text-bk-muted/40"
                                    : `hover:bg-bk-soft ${weekend ? "text-bk-alert" : ""}`
                              }`}
                            >
                              {Number(date.slice(8))}
                              {date === today && !chosen && <span aria-hidden className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canBack}
          onClick={() => setView(addMonths(view, -1))}
          className="absolute left-0 top-0 flex size-11 items-center justify-center rounded-full text-[1.25rem] transition-colors hover:bg-bk-soft disabled:pointer-events-none disabled:opacity-25"
        >
          <span aria-hidden>‹</span>
        </button>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canForward}
          onClick={() => setView(addMonths(view, 1))}
          className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-full text-[1.25rem] transition-colors hover:bg-bk-soft disabled:pointer-events-none disabled:opacity-25"
        >
          <span aria-hidden>›</span>
        </button>
      </div>

      {(status || weekendNights || actions) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-bk-line pt-3 text-[0.85rem]">
          <div className="min-w-0">
            {status && (
              <p aria-live="polite" className="text-bk-ink">
                {status}
              </p>
            )}
            {weekendNights && (
              <p className="mt-0.5 text-bk-muted">
                <span className="text-bk-alert">Fri</span> and <span className="text-bk-alert">Sat</span> nights take the weekend rate
              </p>
            )}
          </div>
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}

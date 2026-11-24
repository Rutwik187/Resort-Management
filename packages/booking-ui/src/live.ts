"use client";

import { createContext, useEffect, useMemo, useRef, useState } from "react";

/*
 * Live free rooms and seats (booking step 2): sold-out rooms and full
 * passes show as such in the lists, not hidden. The site's server action
 * reads them from the database each time the dates change; they are never
 * cached. A room type or pass the resort hasn't set up comes with
 * `online: false`: it is booked by request, never shown as sold out.
 */

export type LiveQuery = { checkIn: string; checkOut: string } | { day: string } | { closed: "stay" | "day"; from: string; to: string };
export type LiveStock = {
  rooms: { code: string; free: number; note: string | null; online?: false }[];
  /** `online: false`: the resort hasn't set this pass's seats, so the site takes a request for it instead of a payment. */
  passes: { code: string; left: number; note: string | null; online?: false }[];
  /** For a `closed` query: the nights or days with nothing left to sell (BW-04). */
  closed?: string[];
};
export type LiveCheck = (query: LiveQuery) => Promise<LiveStock | null>;

/** The live stock for the query, or null until it loads, without a check, or when it fails. */
export function useLiveStock(check: LiveCheck | undefined, query: LiveQuery | null): LiveStock | null {
  // A server action passed from the page is a new function after each refresh; the ref keeps the effect from running again for that.
  const latest = useRef(check);
  useEffect(() => {
    latest.current = check;
  }, [check]);
  const key = query ? JSON.stringify(query) : "";
  const [loaded, setLoaded] = useState<{ key: string; stock: LiveStock | null }>({ key: "", stock: null });
  const has = Boolean(check);
  useEffect(() => {
    if (!key || !has || !latest.current) return;
    let current = true;
    latest.current(JSON.parse(key) as LiveQuery)
      .then((stock) => {
        if (current) setLoaded({ key, stock });
      })
      .catch(() => {
        // Without live stock the lists show as before, and the hold still refuses a sold-out room.
      });
    return () => {
      current = false;
    };
  }, [key, has]);
  return loaded.key === key ? loaded.stock : null;
}

/*
 * Dates with nothing left to sell, greyed out in every calendar inside a
 * planner (BW-04): nights when every room is taken, or days when every
 * package is full. Read once when the planner opens, for the next 18
 * months. Without them the calendar works as before, and the hold still
 * refuses what is sold out.
 */
const none: ReadonlySet<string> = new Set();
export type ClosedDates = { stay: ReadonlySet<string>; day: ReadonlySet<string> };
export const ClosedDatesContext = createContext<ClosedDates>({ stay: none, day: none });

/** Loads the closed dates for stays or day visits, from today. */
export function useClosedDates(check: LiveCheck | undefined, kind: "stay" | "day", today: string): ClosedDates {
  const latest = useRef(check);
  useEffect(() => {
    latest.current = check;
  }, [check]);
  const has = Boolean(check);
  const [closed, setClosed] = useState<ReadonlySet<string>>(none);
  useEffect(() => {
    if (!has || !today || !latest.current) return;
    let current = true;
    const to = new Date(Date.parse(`${today}T00:00:00Z`) + 548 * 86_400_000).toISOString().slice(0, 10);
    latest.current({ closed: kind, from: today, to })
      .then((stock) => {
        if (current && stock?.closed?.length) setClosed(new Set(stock.closed));
      })
      .catch(() => {
        // The calendar shows every date; the hold still refuses a sold-out one.
      });
    return () => {
      current = false;
    };
  }, [has, kind, today]);
  return useMemo(() => (kind === "stay" ? { stay: closed, day: none } : { stay: none, day: closed }), [kind, closed]);
}

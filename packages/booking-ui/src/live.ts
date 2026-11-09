"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Live free rooms and seats (booking step 2): sold-out rooms and full
 * passes show as such in the lists, not hidden. The site's server action
 * reads them from the database each time the dates change; they are never
 * cached. A room type or pass the resort hasn't set up is left out, so it
 * never looks sold out.
 */

export type LiveQuery = { checkIn: string; checkOut: string } | { day: string };
export type LiveStock = {
  rooms: { code: string; free: number; note: string | null }[];
  passes: { code: string; left: number; note: string | null }[];
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

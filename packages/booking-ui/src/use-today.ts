"use client";

import { useSyncExternalStore } from "react";
import { todayInIndia } from "./dates";

const noop = () => () => {};

/** Today's date in India, once the page runs in the browser. Empty while prerendering. */
export const useToday = () => useSyncExternalStore(noop, () => todayInIndia(), () => "");

const wideQuery = "(min-width: 48rem)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(wideQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on screens from md up, where a calendar shows two months side by side. */
export const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(wideQuery).matches, () => false);

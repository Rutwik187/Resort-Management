import { isDate } from "./dates";
import { defaultSearch, searchParamNames } from "./search-bar";
import type { Party, StaySearch } from "./types";

const count = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

/** A search from the page's address, as the home page's search bar sends it. Null if there is none. */
export function searchFromAddress(query: string): StaySearch | null {
  const params = new URLSearchParams(query);
  const checkIn = params.get(searchParamNames.checkIn);
  const checkOut = params.get(searchParamNames.checkOut);
  if (!isDate(checkIn) || !isDate(checkOut) || checkOut <= checkIn) return null;
  return {
    checkIn,
    checkOut,
    rooms: count(params.get(searchParamNames.rooms), 1, 20, defaultSearch.rooms),
    adults: count(params.get(searchParamNames.adults), 1, 60, defaultSearch.adults),
    children: count(params.get(searchParamNames.children), 0, 30, defaultSearch.children),
  };
}

export function addressFor(search: StaySearch) {
  const params = new URLSearchParams({
    [searchParamNames.checkIn]: search.checkIn,
    [searchParamNames.checkOut]: search.checkOut,
    [searchParamNames.rooms]: String(search.rooms),
    [searchParamNames.adults]: String(search.adults),
    [searchParamNames.children]: String(search.children),
  });
  return `?${params}`;
}

const isParty = (value: unknown): value is Party => {
  const p = value as Party;
  return Boolean(p) && [p.adults, p.children5to11, p.children3to5, p.under3].every((n) => Number.isInteger(n) && n >= 0);
};

/**
 * The guest's selection, kept for this browser tab only, so moving between
 * pages never loses it. Anything that no longer fits the site is dropped.
 */
export function readSaved<T extends { key: string; party: Party }>(key: string, valid: (item: T) => boolean) {
  try {
    const raw = JSON.parse(sessionStorage.getItem(key) ?? "null") as { search?: StaySearch; items?: T[] } | null;
    const search = raw?.search && isDate(raw.search.checkIn) && isDate(raw.search.checkOut) ? raw.search : null;
    const items = Array.isArray(raw?.items) ? raw.items.filter((item) => item && typeof item.key === "string" && isParty(item.party) && valid(item)) : [];
    return { search, items };
  } catch {
    return { search: null, items: [] as T[] };
  }
}

export function save(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing can refuse storage. The selection still works on this page.
  }
}

export const newKey = (id: string) => `${id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

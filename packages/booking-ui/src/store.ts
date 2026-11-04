"use client";

import { useSyncExternalStore } from "react";
import { save } from "./saved";

type Store<T> = {
  subscribe: (listener: () => void) => () => void;
  get: () => T;
  set: (next: T) => void;
};

const stores = new Map<string, Store<unknown>>();

/**
 * A guest's selection, kept in this browser tab's session storage and shared
 * with React as an outside store. The server, and the first render in the
 * browser, see `empty`; React then switches to the saved value without a
 * hydration mismatch.
 */
export function useSessionValue<T>(key: string, empty: T, read: () => T): [T, (next: T) => void] {
  let store = stores.get(key) as Store<T> | undefined;
  if (!store) {
    let current: T | undefined;
    const listeners = new Set<() => void>();
    store = {
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      get() {
        if (current === undefined) current = read();
        return current;
      },
      set(next) {
        current = next;
        save(key, next);
        listeners.forEach((listener) => listener());
      },
    };
    stores.set(key, store as Store<unknown>);
  }
  const value = useSyncExternalStore(store.subscribe, store.get, () => empty);
  return [value, store.set];
}

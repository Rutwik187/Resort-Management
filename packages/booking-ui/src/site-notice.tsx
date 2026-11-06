"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useToday } from "./use-today";

/** A notice from the admin, such as "The pool is closed for cleaning on 12 November". */
export type SiteNotice = { id: string; message: string; linkLabel: string | null; linkUrl: string | null; startsOn: string | null; endsOn: string | null };

/** The notices this browser has closed, newest last. */
const storageKey = "bk-closed-notices";
const keep = 30;

function readClosed() {
  try {
    return localStorage.getItem(storageKey) ?? "[]";
  } catch {
    // Storage can be blocked, as in some private windows. Then nothing counts as closed.
    return "[]";
  }
}

function closedIds(raw: string): string[] {
  try {
    const ids: unknown = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Other tabs closing a notice. The same tab hides it through its own state. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Whether a notice is on today. Both days count. */
export const noticeIsOn = (notice: SiteNotice, today: string) => (!notice.startsOn || notice.startsOn <= today) && (!notice.endsOn || notice.endsOn >= today);

/**
 * The resort's notice, in a small card at the foot of the screen. One shows
 * at a time: the newest that is on today and this browser hasn't closed.
 * Closing it is remembered, so it stays closed on the guest's next visits.
 * Nothing shows while the page is prerendered, so a cached page never shows
 * a notice on the wrong day.
 */
export function SiteNoticeCard({ notices }: { notices: SiteNotice[] }) {
  const today = useToday();
  const closed = useSyncExternalStore(subscribe, readClosed, () => null);
  const [closedNow, setClosedNow] = useState<string | null>(null);
  if (!today || closed === null) return null;
  const notice = notices.find((n) => noticeIsOn(n, today) && !closedIds(closed).includes(n.id));
  // After a close, the next notice waits for the next page, so one doesn't jump in for the other.
  if (!notice || closedNow) return null;

  const close = () => {
    setClosedNow(notice.id);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...closedIds(readClosed()), notice.id].slice(-keep)));
    } catch {
      // Not remembered, so it shows again on the next page. It is still closed on this one.
    }
  };
  const link = notice.linkUrl && notice.linkLabel ? { href: notice.linkUrl, label: notice.linkLabel } : null;
  const linkClass = "bk-button mt-2 inline-flex items-center gap-1.5 font-medium text-bk-ink underline decoration-bk-line underline-offset-4 transition-colors hover:decoration-current";

  return (
    <aside role="status" aria-label="Notice" className="bk-notice fixed inset-x-3 bottom-3 z-30 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[23rem]">
      <div className="flex items-start gap-3 rounded-bk border border-bk-line bg-bk-card py-3.5 pl-4 pr-2 text-bk-ink shadow-[0_24px_60px_-24px_rgb(0_0_0/0.45)]">
        <span aria-hidden className="relative mt-[0.45rem] flex size-2 shrink-0">
          <span className="bk-notice-ping absolute inset-0 rounded-full bg-bk-accent opacity-60" />
          <span className="relative size-2 rounded-full bg-bk-accent" />
        </span>
        <div className="min-w-0 flex-1 text-[0.95rem] leading-snug">
          <p className="text-pretty">{notice.message}</p>
          {link &&
            (link.href.startsWith("/") ? (
              <Link href={link.href} className={linkClass}>
                {link.label}
                <span aria-hidden>→</span>
              </Link>
            ) : (
              <a href={link.href} target="_blank" rel="noreferrer" className={linkClass}>
                {link.label}
                <span aria-hidden>↗</span>
              </a>
            ))}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close the notice"
          className="-my-1 flex size-9 shrink-0 items-center justify-center rounded-full text-[1.35rem] leading-none text-bk-muted transition-colors hover:bg-bk-soft hover:text-bk-ink"
        >
          <span aria-hidden>×</span>
        </button>
      </div>
    </aside>
  );
}

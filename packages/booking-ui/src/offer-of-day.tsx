"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/*
 * The Offer of the Day (OFR-01), with a countdown to midnight in India.
 * The page passes the scheduled days; this picks today's by the clock, so a
 * page cached overnight still shows the right one, and hides itself when
 * none is scheduled.
 */

export type OfferDay = { day: string; title: string; details: string | null; label: string; terms: string[] };

const indiaNow = () => new Date(Date.now() + 330 * 60_000);
const indiaToday = () => indiaNow().toISOString().slice(0, 10);

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(indiaNow());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function OfferOfTheDayStrip({ days, href = "/offers", label = "See the offer", className = "" }: { days: OfferDay[]; href?: string; label?: string; className?: string }) {
  const now = useClock();
  if (!now) return null;
  const today = indiaToday();
  const offer = days.find((d) => d.day === today);
  if (!offer) return null;
  // Seconds left until midnight in India.
  const left = 86_400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds());
  const hh = String(Math.floor(left / 3600)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <aside aria-label="Offer of the Day" className={`bk-offer-day text-bk-ink ${className}`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-bk border border-bk-line bg-bk-card px-5 py-4 shadow-[0_18px_40px_-28px_rgb(0_0_0/0.4)]">
        <div className="min-w-0 flex-1">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-bk-accent">Offer of the Day · {offer.label}</p>
          <p className="bk-display mt-1 text-[1.35rem] leading-tight">{offer.title}</p>
          {offer.details && <p className="mt-1 text-[0.92rem] text-bk-muted">{offer.details}</p>}
        </div>
        <div className="flex items-center gap-4">
          <p className="text-[0.85rem] text-bk-muted">
            Ends in{" "}
            <span className="block text-[1.25rem] font-semibold tabular-nums text-bk-ink" role="timer" aria-live="off">
              {hh}:{mm}:{ss}
            </span>
          </p>
          <Link href={href} className="bk-button inline-flex min-h-11 items-center rounded-bk-control bg-bk-accent px-4 text-bk-accent-ink">
            {label}
          </Link>
        </div>
      </div>
    </aside>
  );
}

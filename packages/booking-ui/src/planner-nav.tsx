"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarMark } from "./date-field";

type PlannerNavProps = {
  /** The guest's dates and guests, such as "12 to 14 Nov · 2 guests". Empty until they choose dates. */
  summary: string;
  onSummary: () => void;
  /** Every listing on the page, in order, by its card's id. */
  items: { id: string; label: string }[];
};

/**
 * A bar that stays under the site header while the guest scrolls the list:
 * their dates and guests, which open to change, then every room type by name.
 * A name jumps to its card, and the card on screen is marked.
 */
export function PlannerNav({ summary, onSummary, items }: PlannerNavProps) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const barRef = useRef<HTMLDivElement>(null);

  // Mark the card that crosses a band near the top of the screen.
  useEffect(() => {
    const cards = items.map((item) => document.getElementById(item.id)).filter((card): card is HTMLElement => card !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.find((entry) => entry.isIntersecting);
        if (seen) setActive(seen.target.id);
      },
      { rootMargin: "-30% 0px -65% 0px" },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items]);

  // Keep the marked name in view inside the bar, moving the bar only when the name is cut off. At the first room type, the bar goes back to its start.
  useEffect(() => {
    const bar = barRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-card="${active}"]`);
    if (!bar || !chip) return;
    if (active === items[0]?.id) {
      if (bar.scrollLeft > 0) bar.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    const edge = 48;
    const start = chip.offsetLeft;
    const end = start + chip.offsetWidth;
    if (start < bar.scrollLeft + edge) bar.scrollTo({ left: start - edge, behavior: "smooth" });
    else if (end > bar.scrollLeft + bar.clientWidth - edge) bar.scrollTo({ left: end - bar.clientWidth + edge, behavior: "smooth" });
  }, [active, items]);

  const jump = (id: string) => {
    const card = document.getElementById(id);
    if (!card) return;
    setActive(id);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  };

  return (
    <nav aria-label="Room types on this page" className="sticky top-[var(--bk-sticky-top)] z-20 border-b border-bk-line bg-bk-page/95 backdrop-blur-sm">
      <div
        ref={barRef}
        className="relative flex items-center gap-2 overflow-x-auto py-2.5 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={onSummary}
          className={`flex min-h-10 shrink-0 items-center gap-2 rounded-bk-control border bg-bk-card px-3.5 text-[0.88rem] text-bk-ink transition-colors hover:border-bk-ink ${
            summary ? "border-bk-line" : "border-bk-ink font-medium"
          }`}
        >
          <CalendarMark />
          {summary || "Add your dates"}
          <span className="sr-only">: change dates and guests</span>
        </button>
        <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-bk-line" />
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            data-card={item.id}
            aria-current={active === item.id ? "true" : undefined}
            onClick={() => jump(item.id)}
            className={`min-h-10 shrink-0 rounded-bk-control px-3.5 text-[0.88rem] transition-colors ${
              active === item.id ? "bg-bk-ink text-bk-card" : "text-bk-muted hover:bg-bk-soft hover:text-bk-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
        <span aria-hidden className="w-6 shrink-0" />
      </div>
    </nav>
  );
}

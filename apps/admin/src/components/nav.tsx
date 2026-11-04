"use client";

import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";

const link = "shrink-0 rounded-md px-2.5 py-1.5 text-[0.88rem] hover:bg-page hover:text-ink";

/** The header's links: each resort the person works at, then pages for the whole group. */
export function HeaderNav({ resorts, extra }: { resorts: { code: string; name: string }[]; extra: { href: string; label: string }[] }) {
  const first = usePathname().split("/")[1] ?? "";
  return (
    <nav aria-label="Resorts" className="-mx-1 flex gap-1 overflow-x-auto px-1 whitespace-nowrap">
      {resorts.map((resort) => {
        const current = first === resort.code.toLowerCase();
        return (
          <Link key={resort.code} href={`/${resort.code.toLowerCase()}`} aria-current={current ? "page" : undefined} className={`${link} ${current ? "bg-page font-semibold text-ink" : "text-muted"}`}>
            {resort.name}
          </Link>
        );
      })}
      {extra.map((item) => {
        const current = `/${first}` === item.href;
        return (
          <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={`${link} ${current ? "bg-page font-semibold text-ink" : "text-muted"}`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** A resort's sections. `segment` is the folder under the resort, or null for its first page. */
export function ResortTabs({ tabs }: { tabs: { href: string; label: string; segment: string | null }[] }) {
  const active = useSelectedLayoutSegment();
  return (
    <nav aria-label="Resort sections" className="-mx-1 mt-4 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const current = tab.segment === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-[0.9rem] ${current ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DateRangeField } from "@/components/date-field";

const periods = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["month", "This month"],
  ["last-month", "Last month"],
  ["30", "Last 30 days"],
  ["year", "This financial year"],
] as const;

/** The report's period: one of the usual ones, or any dates. The daily report offers today and yesterday only. */
export function PeriodPicker({ base, current, from, to, limited }: { base: string; current: string; from: string; to: string; limited: boolean }) {
  const router = useRouter();
  const shown = limited ? periods.filter(([key]) => key === "today" || key === "yesterday") : periods;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav aria-label="Period" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {shown.map(([key, label]) => (
          <Link
            key={key}
            href={key === "month" ? base : `${base}?period=${key}`}
            aria-current={current === key ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${current === key ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {!limited && (
        <div className="w-full sm:w-auto">
          <DateRangeField
            key={`${from}-${to}`}
            id="report-dates"
            names={["from", "to"]}
            defaultValue={current === "custom" ? [from, to] : [undefined, undefined]}
            placeholder="Choose dates"
            short
            onChange={(start, end) => {
              if (start && end) router.push(`${base}?period=custom&from=${start}&to=${end}`);
              else router.push(base);
            }}
            className={current === "custom" ? "border-primary/40 bg-primary/[0.04] font-medium" : undefined}
          />
        </div>
      )}
    </div>
  );
}

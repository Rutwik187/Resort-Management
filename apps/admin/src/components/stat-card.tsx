import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * One headline number (the dataviz guide's stat tile): what it counts, the
 * number, and a line of context. A meter shows a share, such as rooms booked
 * tonight: the chart green on a lighter step of the same green. A tile with
 * a link opens the list behind the number.
 */
export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  meter,
  href,
  className,
}: {
  label: string;
  value: string;
  note?: string;
  icon?: LucideIcon;
  /** A share from 0 to 1, and what it is a share of, for screen readers. */
  meter?: { share: number; label: string };
  href?: string;
  className?: string;
}) {
  const share = meter ? Math.min(1, Math.max(0, meter.share)) : 0;
  const body = (
    <Card className={cn("relative h-full gap-0 overflow-hidden py-0 shadow-xs", href && "transition-colors group-hover:border-primary/30 group-hover:bg-accent/40", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary ring-1 ring-primary/10 ring-inset">
            <Icon className="size-[18px]" />
          </span>
        )}
      </div>
      <div className="px-5 pt-1 pb-5">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        {meter && (
          <div
            role="meter"
            aria-label={meter.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(share * 100)}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-chart/15"
          >
            <div className="h-full rounded-full bg-chart" style={{ width: `${share * 100}%` }} />
          </div>
        )}
        {note && <p className={cn("text-sm text-muted-foreground", meter ? "mt-2" : "mt-1")}>{note}</p>}
      </div>
      {href && <ArrowUpRight aria-hidden="true" className="absolute right-5 bottom-5 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
    </Card>
  );
  if (!href) return body;
  return (
    <Link href={href} className="group block h-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
      {body}
    </Link>
  );
}

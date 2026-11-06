import { Badge } from "@/components/ui/badge";
import { leadStatusLabel } from "@/lib/format";
import type { LeadStatus } from "@/lib/leads";
import { cn } from "@/lib/utils";

/** New waits on staff, quoted waits on the guest, booked is done, lost is over. The words carry it too. */
const look: Record<LeadStatus, { badge: string; dot: string }> = {
  new: { badge: "border-primary/30 bg-primary/10 text-primary", dot: "bg-primary" },
  contacted: { badge: "border-border bg-secondary text-secondary-foreground", dot: "bg-muted-foreground" },
  quoted: { badge: "border-warn/30 bg-warn/10 text-warn", dot: "bg-warn" },
  won: { badge: "border-good/30 bg-good/10 text-good", dot: "bg-good" },
  lost: { badge: "border-border bg-transparent text-muted-foreground", dot: "bg-muted-foreground/60" },
};

export function LeadStatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium whitespace-nowrap", look[status].badge, className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", look[status].dot)} />
      {leadStatusLabel[status]}
    </Badge>
  );
}

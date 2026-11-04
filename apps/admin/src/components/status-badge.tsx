import type { BookingStatus } from "@repo/engine";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Each status's colour: amber waits on someone, green is settled, red went wrong, grey is over. The dot and the words carry it too. */
const look: Record<BookingStatus, { badge: string; dot: string }> = {
  pending_payment: { badge: "border-warn/30 bg-warn/10 text-warn", dot: "bg-warn" },
  part_paid: { badge: "border-warn/30 bg-warn/10 text-warn", dot: "bg-warn" },
  confirmed: { badge: "border-good/30 bg-good/10 text-good", dot: "bg-good" },
  checked_in: { badge: "border-primary bg-primary text-primary-foreground", dot: "bg-primary-foreground" },
  checked_out: { badge: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  cancelled: { badge: "border-danger/30 bg-danger/10 text-danger", dot: "bg-danger" },
  no_show: { badge: "border-danger/30 bg-danger/10 text-danger", dot: "bg-danger" },
  refunded: { badge: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  expired: { badge: "border-border bg-transparent text-muted-foreground", dot: "bg-muted-foreground/60" },
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium whitespace-nowrap", look[status].badge, className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", look[status].dot)} />
      {statusLabel[status]}
    </Badge>
  );
}

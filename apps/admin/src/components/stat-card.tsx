import type { LucideIcon } from "lucide-react";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/** One headline number: what it counts, the number, and a line of context. */
export function StatCard({ label, value, note, icon: Icon }: { label: string; value: string; note?: string; icon?: LucideIcon }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
        {Icon && (
          <CardAction>
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
          </CardAction>
        )}
      </CardHeader>
      {note && <CardFooter className="px-5 text-sm text-muted-foreground">{note}</CardFooter>}
    </Card>
  );
}

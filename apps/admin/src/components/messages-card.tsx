import { desc, eq } from "drizzle-orm";
import { Mail } from "lucide-react";
import { getDb, messages } from "@repo/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { when } from "@/lib/format";

/** What each message is, in words. */
const kindLabel: Record<string, string> = {
  booking_confirmed: "Booking confirmed",
  booking_link: "Booking page",
  booking_changed: "Booking changed",
  booking_cancelled: "Booking cancelled",
  refund: "Refund",
  pre_arrival: "Before arrival",
  thank_you: "Thank you",
  team_new_booking: "Team: new booking",
  team_booking_changed: "Team: booking changed",
  team_booking_cancelled: "Team: booking cancelled",
  lead_alert: "Alert to the team",
  lead_reply: "Thank-you to the guest",
  follow_up_reminder: "Follow-up reminder",
};

/** Where a message stands: waiting for Resend, sent, delivered, bounced and so on. */
function state(message: typeof messages.$inferSelect) {
  if (message.delivery === "delivered" || message.delivery === "opened") return { text: message.delivery === "opened" ? "Opened" : "Delivered", tone: "border-good/30 bg-good/10 text-good" };
  if (message.delivery === "bounced" || message.delivery === "complained") return { text: message.delivery === "bounced" ? "Bounced" : "Marked spam", tone: "border-danger/30 bg-danger/10 text-danger" };
  if (message.status === "sent") return { text: message.delivery === "delayed" ? "Delayed" : "Sent", tone: "" };
  if (message.status === "failed") return { text: "Failed", tone: "border-danger/30 bg-danger/10 text-danger" };
  if (message.status === "held") return { text: "Waits for payment", tone: "text-muted-foreground" };
  if (message.status === "cancelled") return { text: "Not sent", tone: "text-muted-foreground" };
  return { text: "Waiting to send", tone: "text-muted-foreground" };
}

/** The emails written for a booking or a lead, newest first, with what happened to each (NOT-05). */
export async function MessagesCard({ bookingId, leadId }: { bookingId?: string; leadId?: string }) {
  const where = bookingId ? eq(messages.bookingId, bookingId) : eq(messages.leadId, leadId!);
  const rows = await getDb().select().from(messages).where(where).orderBy(desc(messages.createdAt)).limit(30);
  if (rows.length === 0) return null;
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Messages</CardTitle>
        <CardDescription>Emails to the guest and the team. They go once Resend is set up; WhatsApp and SMS wait for a provider.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {rows.map((message) => {
            const s = state(message);
            return (
              <li key={message.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-start gap-2">
                  <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="font-medium">{kindLabel[message.kind] ?? message.kind}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      To {message.to} · {when(message.createdAt)}
                    </span>
                    {message.error && message.status === "failed" && <span className="block text-xs text-danger">{message.error}</span>}
                  </span>
                </span>
                <Badge variant="outline" className={`font-normal ${s.tone}`}>
                  {s.text}
                </Badge>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

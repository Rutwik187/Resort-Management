import { and, eq, inArray } from "drizzle-orm";
import { leads, messages, properties, user, type Database, type Executor } from "@repo/db";
import { layout } from "./messages";
import { wording } from "./templates";

/*
 * Lead messages through the outbox (CRM-03, CRM-04): an alert to the person
 * a new lead goes to, a thank-you to a guest who gave an email, and
 * reminders of follow-ups that are due. Each is kept against its lead
 * (NOT-05). WhatsApp alerts wait for a provider; email goes once Resend is
 * set up.
 */

const interestWords: Record<string, string> = { stay: "a stay", day: "a day visit", wedding: "a wedding", corporate: "a corporate booking", event: "an event", other: "something else" };
const adminBase = () => (process.env.ADMIN_URL?.trim() || "https://prathamesh-admin.vercel.app").replace(/\/$/, "");

/** Queues the alert to the assigned person and the guest's thank-you for a new lead. */
export async function queueLeadAlerts(tx: Executor, leadId: string, adminUrl?: string) {
  const [row] = await tx
    .select({ lead: leads, resort: properties.name, code: properties.code, phone: properties.phone, staffEmail: user.email, staffName: user.name })
    .from(leads)
    .innerJoin(properties, eq(properties.id, leads.propertyId))
    .leftJoin(user, eq(user.id, leads.assignedTo))
    .where(eq(leads.id, leadId));
  if (!row) return;
  const { lead } = row;
  const link = `${(adminUrl ?? adminBase()).replace(/\/$/, "")}/${row.code.toLowerCase()}/leads/${lead.id}`;
  if (row.staffEmail) {
    const rows: [string, string][] = [
      ["Guest", lead.name],
      ...(lead.phone ? ([["Phone", `+${lead.phone}`]] as [string, string][]) : []),
      ...(lead.email ? ([["Email", lead.email]] as [string, string][]) : []),
      ["Wants", interestWords[lead.interest] ?? lead.interest],
      ...(lead.dateFrom ? ([["Date", lead.dateTo ? `${lead.dateFrom} to ${lead.dateTo}` : lead.dateFrom]] as [string, string][]) : []),
      ...(lead.guests ? ([["Guests", String(lead.guests)]] as [string, string][]) : []),
      ...(lead.budget ? ([["Budget", lead.budget]] as [string, string][]) : []),
    ];
    const body = layout({
      resort: row.resort,
      heading: `New lead: ${lead.name}`,
      intro: `${lead.name} asked about ${interestWords[lead.interest] ?? "a booking"}. It is yours to follow up.${lead.message ? ` They wrote: "${lead.message.slice(0, 400)}"` : ""}`,
      rows,
      button: { label: "Open the lead", url: link },
      footer: "Sent by the Prathamesh admin because this lead was assigned to you.",
    });
    await tx.insert(messages).values({ propertyId: lead.propertyId, leadId: lead.id, kind: "lead_alert", to: row.staffEmail, subject: `New lead at ${row.resort}: ${lead.name}`, ...body });
  }
  if (lead.email) {
    const words = await wording(tx, lead.propertyId, "lead_reply", { guestName: lead.name.split(" ")[0], resortName: row.resort, phone: row.phone ? `+${row.phone}` : null }, {
      subject: `We have your request, ${row.resort}`,
      intro: `We have your request about ${interestWords[lead.interest] ?? "your visit"} and our team will get back to you soon.${row.phone ? ` For anything urgent, call or WhatsApp +${row.phone}.` : ""}`,
    });
    const body = layout({ resort: row.resort, heading: `Thank you, ${lead.name.split(" ")[0]}`, intro: words.intro, footer: `${row.resort}. You are getting this because you sent us a request.` });
    await tx.insert(messages).values({ propertyId: lead.propertyId, leadId: lead.id, kind: "lead_reply", to: lead.email, subject: words.subject, ...body });
  }
}

/**
 * Emails each person their follow-ups that are due (CRM-04), once a day per
 * lead and person: a lead already reminded today isn't reminded again.
 */
export async function queueFollowUpReminders(db: Database, due: { id: string; propertyId: string; name: string; phone: string | null; followUpOn: string | null; followUpTime: string | null; email: string | null; staffName: string | null }[]) {
  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const remindedToday = due.length
    ? new Set(
        (
          await db
            .select({ leadId: messages.leadId, createdAt: messages.createdAt })
            .from(messages)
            .where(and(eq(messages.kind, "follow_up_reminder"), inArray(messages.leadId, due.map((d) => d.id))))
        )
          .filter((m) => new Date(m.createdAt.getTime() + 330 * 60_000).toISOString().slice(0, 10) === today)
          .map((m) => m.leadId),
      )
    : new Set<string | null>();
  let queued = 0;
  for (const lead of due) {
    if (!lead.email || remindedToday.has(lead.id)) continue;
    const [property] = await db.select({ name: properties.name, code: properties.code }).from(properties).where(eq(properties.id, lead.propertyId));
    const body = layout({
      resort: property.name,
      heading: `Follow up with ${lead.name}`,
      intro: `Your follow-up with ${lead.name}${lead.phone ? ` (+${lead.phone})` : ""} was due ${lead.followUpOn === today ? "today" : `on ${lead.followUpOn}`}${lead.followUpTime ? ` at ${lead.followUpTime.slice(0, 5)}` : ""}.`,
      button: { label: "Open the lead", url: `${adminBase()}/${property.code.toLowerCase()}/leads/${lead.id}` },
      footer: "Sent by the Prathamesh admin. Set the next follow-up on the lead to stop these.",
    });
    await db.insert(messages).values({ propertyId: lead.propertyId, leadId: lead.id, kind: "follow_up_reminder", to: lead.email, subject: `Follow up: ${lead.name}`, ...body });
    queued++;
  }
  return queued;
}

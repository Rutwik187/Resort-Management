import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { leadActivities, leadAssignmentRules, leads, messages, openLeadStatuses, properties, staffMembers, user, type Database, type Executor } from "@repo/db";
import { normalisePhone } from "./bookings";
import { NotFoundError, RuleError } from "./errors";
import { queueLeadAlerts } from "./lead-messages";

export type LeadInterest = "stay" | "day" | "wedding" | "corporate" | "event" | "other";

/** A request from a resort website (the booking widget's selection, or a form), or a lead ad. */
export type WebsiteLeadInput = {
  propertyCode: string;
  source: "website_booking" | "website_enquiry" | "meta_ads" | "google_ads";
  interest: LeadInterest;
  name: string;
  phone: string;
  email?: string;
  dateFrom?: string;
  dateTo?: string;
  guests?: number;
  message?: string;
  /** What the widget held: the rooms or passes, who comes, the prices and the estimate. */
  request?: unknown;
  /** The extra fields a form asked, such as a corporate enquiry's company and meeting needs. */
  details?: Record<string, string>;
  budget?: string;
  /** UTM tags and click IDs (TRK-04). */
  campaign?: Record<string, string>;
  /** What the guest agreed to on the form (WEB-08). */
  consent?: { version: string; marketing: boolean; at: string };
  /** The site's address, for the link in the team's alert. */
  adminUrl?: string;
};

/** How long a guest's open lead takes their next request, rather than a new lead. */
const sameLeadDays = 3;

/**
 * Picks who a new lead goes to (CRM-02): the resort's rule for this kind of
 * lead, or its rule for every kind, taking its staff in turn. Staff who are
 * no longer active are skipped. Null when no rule applies.
 */
export async function nextAssignee(tx: Executor, propertyId: string, interest: LeadInterest): Promise<string | null> {
  const rules = await tx
    .select()
    .from(leadAssignmentRules)
    .where(and(eq(leadAssignmentRules.propertyId, propertyId), sql`(${leadAssignmentRules.interest} = ${interest} or ${leadAssignmentRules.interest} is null)`))
    .orderBy(sql`${leadAssignmentRules.interest} is null`)
    .for("update");
  const rule = rules[0];
  if (!rule || rule.userIds.length === 0) return null;
  const active = await tx
    .select({ userId: staffMembers.userId })
    .from(staffMembers)
    .where(and(inArray(staffMembers.userId, rule.userIds), eq(staffMembers.active, true)));
  const live = new Set(active.map((a) => a.userId));
  for (let step = 0; step < rule.userIds.length; step++) {
    const index = (rule.nextIndex + step) % rule.userIds.length;
    const candidate = rule.userIds[index];
    if (live.has(candidate)) {
      await tx.update(leadAssignmentRules).set({ nextIndex: (index + 1) % rule.userIds.length }).where(eq(leadAssignmentRules.id, rule.id));
      return candidate;
    }
  }
  return null;
}

/**
 * Saves a website request or a lead ad as a lead (docs/implementation-plan.md,
 * section 10: forms create leads). A guest who asks again from the same
 * phone within three days, while their lead is still open, adds to that
 * lead: its dates and request become the latest ones and the timeline keeps
 * both. A new lead goes to the next person in the resort's rule, who gets
 * an alert, and the guest gets a thank-you if they gave an email (CRM-03).
 */
export async function recordWebsiteLead(db: Database, input: WebsiteLeadInput): Promise<{ leadId: string; merged: boolean }> {
  const [property] = await db.select({ id: properties.id }).from(properties).where(eq(properties.code, input.propertyCode));
  if (!property) throw new NotFoundError(`There is no resort ${input.propertyCode}.`);
  const phone = normalisePhone(input.phone);
  const latest = {
    interest: input.interest,
    dateFrom: input.dateFrom ?? null,
    dateTo: input.dateTo ?? null,
    guests: input.guests ?? null,
    message: input.message ?? null,
    request: input.request ?? null,
    ...(input.details && Object.keys(input.details).length ? { details: input.details } : {}),
    ...(input.budget ? { budget: input.budget } : {}),
    ...(input.consent ? { consent: input.consent } : {}),
  };

  return db.transaction(async (tx) => {
    const [open] = phone
      ? await tx
          .select({ id: leads.id })
          .from(leads)
          .where(and(eq(leads.propertyId, property.id), eq(leads.phone, phone), inArray(leads.status, [...openLeadStatuses]), gt(leads.createdAt, sql`now() - make_interval(days => ${sameLeadDays})`)))
          .orderBy(desc(leads.createdAt))
          .limit(1)
      : [];
    if (open) {
      await tx.update(leads).set(latest).where(eq(leads.id, open.id));
      await tx.insert(leadActivities).values({ leadId: open.id, type: "request", data: { source: input.source, ...latest } });
      return { leadId: open.id, merged: true };
    }
    const assignedTo = await nextAssignee(tx, property.id, input.interest);
    const [lead] = await tx
      .insert(leads)
      .values({
        propertyId: property.id,
        source: input.source,
        name: input.name,
        phone,
        email: input.email ?? null,
        assignedTo,
        campaign: input.campaign && Object.keys(input.campaign).length ? input.campaign : null,
        ...latest,
      })
      .returning({ id: leads.id });
    await tx.insert(leadActivities).values({ leadId: lead.id, type: "created", data: { source: input.source } });
    if (assignedTo) await tx.insert(leadActivities).values({ leadId: lead.id, type: "assigned", data: { from: null, to: assignedTo, auto: true } });
    await queueLeadAlerts(tx, lead.id, input.adminUrl);
    return { leadId: lead.id, merged: false };
  });
}

/** Other open or recent leads at the resort with the same phone (CRM-06), newest first. */
export async function duplicateLeads(db: Executor, lead: { id: string; propertyId: string; phone: string | null }) {
  if (!lead.phone) return [];
  return db
    .select({ id: leads.id, name: leads.name, status: leads.status, interest: leads.interest, createdAt: leads.createdAt, bookingId: leads.bookingId })
    .from(leads)
    .where(and(eq(leads.propertyId, lead.propertyId), eq(leads.phone, lead.phone), ne(leads.id, lead.id)))
    .orderBy(desc(leads.createdAt))
    .limit(10);
}

/**
 * Merges a duplicate lead into another (CRM-06): its timeline, messages and
 * advance move across, empty fields are filled from it, and it is removed.
 * A lead that became a booking can't be merged away.
 */
export async function mergeLeads(db: Database, input: { keepId: string; mergeId: string; userId: string }) {
  if (input.keepId === input.mergeId) throw new RuleError("Choose another lead to merge.");
  return db.transaction(async (tx) => {
    const both = await tx.select().from(leads).where(inArray(leads.id, [input.keepId, input.mergeId])).for("update");
    const keep = both.find((l) => l.id === input.keepId);
    const gone = both.find((l) => l.id === input.mergeId);
    if (!keep || !gone) throw new NotFoundError("Lead");
    if (keep.propertyId !== gone.propertyId) throw new RuleError("Only leads at the same resort can be merged.");
    if (gone.bookingId) throw new RuleError(`${gone.name}'s lead became a booking, so it stays. Merge the other way.`);
    const fill = <K extends keyof typeof keep>(key: K) => (keep[key] === null || keep[key] === "" ? gone[key] : keep[key]);
    await tx
      .update(leads)
      .set({
        email: fill("email"),
        phone: fill("phone"),
        dateFrom: fill("dateFrom"),
        dateTo: fill("dateTo"),
        guests: fill("guests"),
        budget: fill("budget"),
        estimatedValuePaise: fill("estimatedValuePaise"),
        assignedTo: fill("assignedTo"),
        followUpOn: fill("followUpOn"),
        details: keep.details || gone.details ? { ...(gone.details ?? {}), ...(keep.details ?? {}) } : null,
        campaign: fill("campaign"),
        consent: fill("consent"),
        message: [keep.message, gone.message].filter(Boolean).join("\n\n") || null,
        advancePaise: keep.advancePaise + gone.advancePaise,
      })
      .where(eq(leads.id, keep.id));
    await tx.update(leadActivities).set({ leadId: keep.id }).where(eq(leadActivities.leadId, gone.id));
    await tx.update(messages).set({ leadId: keep.id }).where(eq(messages.leadId, gone.id));
    await tx.insert(leadActivities).values({ leadId: keep.id, userId: input.userId, type: "merged", note: `Merged ${gone.name}'s lead from ${gone.createdAt.toISOString().slice(0, 10)}.`, data: { mergedId: gone.id, status: gone.status } });
    await tx.delete(leads).where(eq(leads.id, gone.id));
    return { keep, gone };
  });
}

/** Leads at a resort whose follow-up is due now or overdue, for the reminders (CRM-04). */
export async function dueFollowUps(db: Executor, propertyId?: string) {
  return db
    .select({ id: leads.id, propertyId: leads.propertyId, name: leads.name, phone: leads.phone, followUpOn: leads.followUpOn, followUpTime: leads.followUpTime, assignedTo: leads.assignedTo, email: user.email, staffName: user.name })
    .from(leads)
    .leftJoin(user, eq(user.id, leads.assignedTo))
    .where(
      and(
        propertyId ? eq(leads.propertyId, propertyId) : undefined,
        inArray(leads.status, [...openLeadStatuses]),
        sql`(${leads.followUpOn} + coalesce(${leads.followUpTime}, '00:00'::time)) <= (now() at time zone 'Asia/Kolkata')`,
      ),
    )
    .orderBy(asc(leads.followUpOn), asc(leads.followUpTime));
}


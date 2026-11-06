import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { leadActivities, leads, properties, type Database } from "@repo/db";
import { normalisePhone } from "./bookings";
import { NotFoundError } from "./errors";

export type LeadInterest = "stay" | "day" | "wedding" | "event" | "other";

/** A request from a resort website: the booking widget's selection, or the enquiry form. */
export type WebsiteLeadInput = {
  propertyCode: string;
  source: "website_booking" | "website_enquiry";
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
};

/** How long a guest's open lead takes their next request, rather than a new lead. */
const sameLeadDays = 3;

/**
 * Saves a website request as a lead (docs/implementation-plan.md, section
 * 10: forms create leads). A guest who asks again from the same phone
 * within three days, while their lead is still open, adds to that lead:
 * its dates and request become the latest ones and the timeline keeps both.
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
  };

  return db.transaction(async (tx) => {
    const [open] = phone
      ? await tx
          .select({ id: leads.id })
          .from(leads)
          .where(
            and(
              eq(leads.propertyId, property.id),
              eq(leads.phone, phone),
              inArray(leads.status, ["new", "contacted", "quoted"]),
              gt(leads.createdAt, sql`now() - make_interval(days => ${sameLeadDays})`),
            ),
          )
          .orderBy(desc(leads.createdAt))
          .limit(1)
      : [];
    if (open) {
      await tx.update(leads).set(latest).where(eq(leads.id, open.id));
      await tx.insert(leadActivities).values({ leadId: open.id, type: "request", data: { source: input.source, ...latest } });
      return { leadId: open.id, merged: true };
    }
    const [lead] = await tx
      .insert(leads)
      .values({ propertyId: property.id, source: input.source, name: input.name, phone, email: input.email ?? null, ...latest })
      .returning({ id: leads.id });
    await tx.insert(leadActivities).values({ leadId: lead.id, type: "created", data: { source: input.source } });
    return { leadId: lead.id, merged: false };
  });
}

import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, lte, or, sql, type SQL } from "drizzle-orm";
import { bookings, getDb, leadActivities, leads, rolePermissions, staffMembers, staffProperties, user } from "@repo/db";

export type LeadStatus = "new" | "contacted" | "quoted" | "won" | "lost";
export type LeadInterest = "stay" | "day" | "wedding" | "event" | "other";

/** Leads still being worked: not booked and not lost. */
export const openStatuses: LeadStatus[] = ["new", "contacted", "quoted"];

export type LeadFilters = { status?: LeadStatus | "open"; interest?: LeadInterest; q?: string; mine?: string };

const likeText = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** A resort's leads, newest first, with who works each one. At most 200 at a time. */
export async function findLeads(propertyId: string, filters: LeadFilters) {
  const q = filters.q?.trim();
  const digits = q?.replace(/\D/g, "") ?? "";
  const where: (SQL | undefined)[] = [
    eq(leads.propertyId, propertyId),
    filters.status === "open" ? inArray(leads.status, openStatuses) : filters.status ? eq(leads.status, filters.status) : undefined,
    filters.interest ? eq(leads.interest, filters.interest) : undefined,
    filters.mine ? eq(leads.assignedTo, filters.mine) : undefined,
    q ? or(ilike(leads.name, likeText(q)), ilike(leads.email, likeText(q)), digits.length >= 4 ? ilike(leads.phone, likeText(digits)) : undefined) : undefined,
  ];
  return getDb()
    .select({
      id: leads.id,
      status: leads.status,
      source: leads.source,
      interest: leads.interest,
      name: leads.name,
      phone: leads.phone,
      dateFrom: leads.dateFrom,
      dateTo: leads.dateTo,
      guests: leads.guests,
      followUpOn: leads.followUpOn,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      assignedName: user.name,
      assignedImage: user.image,
    })
    .from(leads)
    .leftJoin(user, eq(user.id, leads.assignedTo))
    .where(and(...where))
    .orderBy(desc(leads.updatedAt))
    .limit(200);
}

/** How many leads are in each state, and how many open ones are due for a follow-up by `today`. */
export async function leadCounts(propertyId: string, today: string) {
  const db = getDb();
  const rows = await db.select({ status: leads.status, n: count() }).from(leads).where(eq(leads.propertyId, propertyId)).groupBy(leads.status);
  const [due] = await db
    .select({ n: count() })
    .from(leads)
    .where(and(eq(leads.propertyId, propertyId), inArray(leads.status, openStatuses), isNotNull(leads.followUpOn), lte(leads.followUpOn, today)));
  const by = (status: LeadStatus) => rows.find((r) => r.status === status)?.n ?? 0;
  return {
    new: by("new"),
    contacted: by("contacted"),
    quoted: by("quoted"),
    won: by("won"),
    lost: by("lost"),
    open: by("new") + by("contacted") + by("quoted"),
    all: rows.reduce((sum, r) => sum + r.n, 0),
    due: due?.n ?? 0,
  };
}

/** One lead with its timeline, its booking and the names of the staff in it. */
export async function loadLead(propertyId: string, leadId: string) {
  const db = getDb();
  const [lead] = await db.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.propertyId, propertyId)));
  if (!lead) return null;
  const activities = await db.select().from(leadActivities).where(eq(leadActivities.leadId, leadId)).orderBy(desc(leadActivities.at), desc(leadActivities.id));
  const ids = [...new Set([lead.assignedTo, ...activities.map((a) => a.userId)].filter((id): id is string => Boolean(id)))];
  const people = ids.length ? await db.select({ id: user.id, name: user.name, image: user.image }).from(user).where(inArray(user.id, ids)) : [];
  const [booking] = lead.bookingId ? await db.select({ number: bookings.number, status: bookings.status }).from(bookings).where(eq(bookings.id, lead.bookingId)) : [];
  // Other leads from the same phone at this resort, such as last year's.
  const earlier = lead.phone
    ? await db
        .select({ id: leads.id, status: leads.status, interest: leads.interest, createdAt: leads.createdAt })
        .from(leads)
        .where(and(eq(leads.propertyId, propertyId), eq(leads.phone, lead.phone), sql`${leads.id} <> ${lead.id}`))
        .orderBy(desc(leads.createdAt))
        .limit(5)
    : [];
  return { lead, activities, people: new Map(people.map((p) => [p.id, p])), booking: booking ?? null, earlier };
}

/** Open leads waiting longest for a reply, for the Today page. */
export async function leadsToAnswer(propertyId: string, today: string, limit = 5) {
  return getDb()
    .select({ id: leads.id, name: leads.name, interest: leads.interest, status: leads.status, followUpOn: leads.followUpOn, createdAt: leads.createdAt, source: leads.source })
    .from(leads)
    .where(and(eq(leads.propertyId, propertyId), or(eq(leads.status, "new"), and(inArray(leads.status, openStatuses), lte(leads.followUpOn, today)))))
    .orderBy(asc(leads.createdAt))
    .limit(limit);
}

/** Staff who may work leads at this resort, for the menu that hands a lead to someone. */
export async function leadWorkers(propertyId: string) {
  return getDb()
    .selectDistinct({ id: user.id, name: user.name, image: user.image })
    .from(staffMembers)
    .innerJoin(user, eq(user.id, staffMembers.userId))
    .innerJoin(rolePermissions, and(eq(rolePermissions.roleId, staffMembers.roleId), eq(rolePermissions.permission, "leads.manage")))
    .leftJoin(staffProperties, and(eq(staffProperties.userId, staffMembers.userId), eq(staffProperties.propertyId, propertyId)))
    .where(and(eq(staffMembers.active, true), or(eq(staffMembers.allProperties, true), isNotNull(staffProperties.propertyId))))
    .orderBy(asc(user.name));
}

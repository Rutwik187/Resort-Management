"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, leadActivities, leads, properties } from "@repo/db";
import { NotFoundError, normalisePhone } from "@repo/engine";
import { date, filled, problem, wholeNumber, type FormState } from "@/lib/forms";
import { leadStatusLabel } from "@/lib/format";
import { audit, requirePermission } from "@/lib/staff";

const statuses = ["new", "contacted", "quoted", "won", "lost"] as const;
const interests = ["stay", "day", "wedding", "event", "other"] as const;
const staffSources = ["phone", "walk_in", "whatsapp", "email", "referral", "other"] as const;

/** A lead and the permission to work it, or an error. */
async function workable(leadId: string) {
  z.uuid().parse(leadId);
  const [lead] = await getDb().select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new NotFoundError("That lead no longer exists.");
  const staff = await requirePermission("leads.manage", lead.propertyId);
  return { lead, staff };
}

const leadInput = z.object({
  name: z.string().trim().min(2, "Write the guest's name.").max(80),
  phone: z.string().trim().max(30).optional(),
  email: z.email("Check the email address.").optional(),
  interest: z.enum(interests),
  source: z.enum(staffSources),
  dateFrom: date("date").optional(),
  dateTo: date("last date").optional(),
  guests: wholeNumber("The number of guests", 1, 5000).optional(),
  message: z.string().trim().max(4000).optional(),
  followUpOn: date("follow-up date").optional(),
});

/** A lead taken by phone, at the desk or from a referral. It opens on its own page. */
export async function createLead(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  let path: string;
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("leads.manage", propertyId);
    const input = leadInput.parse(filled(form));
    if (!input.phone && !input.email) return { error: "Add a phone number or an email, so the team can reply." };
    const db = getDb();
    const [lead] = await db
      .insert(leads)
      .values({ propertyId, ...input, phone: normalisePhone(input.phone), assignedTo: staff.userId, createdBy: staff.userId })
      .returning();
    await db.insert(leadActivities).values({ leadId: lead.id, userId: staff.userId, type: "created", data: { source: input.source } });
    await audit({ userId: staff.userId, propertyId, action: "lead.create", entity: "leads", entityId: lead.id, after: lead });
    const [property] = await db.select({ code: properties.code }).from(properties).where(eq(properties.id, propertyId));
    path = `/${property.code.toLowerCase()}/leads/${lead.id}`;
  } catch (error) {
    return problem(error, "Your role can't add leads at this resort.");
  }
  redirect(path);
}

/** Moves a lead along: contacted, quoted, lost (with a reason), or back to new. */
export async function setLeadStatus(leadId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const { lead, staff } = await workable(leadId);
    const input = z
      .object({ status: z.enum(statuses), reason: z.string().trim().max(300).optional() })
      .refine((v) => v.status !== "lost" || (v.reason && v.reason.length >= 3), { message: "Say why it was lost, such as booked elsewhere." })
      .parse(filled(form));
    if (input.status === lead.status) return { done: `Already ${leadStatusLabel[lead.status].toLowerCase()}.` };
    if (input.status === "won" && !lead.bookingId) return { error: "A lead is booked by making its booking: use Make a booking." };
    const db = getDb();
    await db
      .update(leads)
      .set({ status: input.status, lostReason: input.status === "lost" ? input.reason : null })
      .where(eq(leads.id, leadId));
    await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: "status", note: input.status === "lost" ? input.reason : null, data: { from: lead.status, to: input.status } });
    await audit({ userId: staff.userId, propertyId: lead.propertyId, action: "lead.status", entity: "leads", entityId: leadId, before: { status: lead.status }, after: { status: input.status, reason: input.reason } });
    refresh();
    return { done: `Marked ${leadStatusLabel[input.status].toLowerCase()}.` };
  } catch (error) {
    return problem(error, "Your role can't work leads at this resort.");
  }
}

/** Hands a lead to a staff member, or takes it back. */
export async function assignLead(leadId: string, userId: string | null): Promise<FormState> {
  try {
    const { lead, staff } = await workable(leadId);
    const to = userId === "me" ? staff.userId : userId;
    const db = getDb();
    await db.update(leads).set({ assignedTo: to }).where(eq(leads.id, leadId));
    await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: "assigned", data: { from: lead.assignedTo, to } });
    await audit({ userId: staff.userId, propertyId: lead.propertyId, action: "lead.assign", entity: "leads", entityId: leadId, before: { assignedTo: lead.assignedTo }, after: { assignedTo: to } });
    refresh();
    return { done: to ? "Handed over." : "No one is on it now." };
  } catch (error) {
    return problem(error, "Your role can't work leads at this resort.");
  }
}

/** The day someone should get back to the guest. Empty clears it. */
export async function setFollowUp(leadId: string, day: string | null): Promise<FormState> {
  try {
    const { lead, staff } = await workable(leadId);
    const followUpOn = day ? date("follow-up date").parse(day) : null;
    const db = getDb();
    await db.update(leads).set({ followUpOn }).where(eq(leads.id, leadId));
    await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: "follow_up", data: { from: lead.followUpOn, to: followUpOn } });
    await audit({ userId: staff.userId, propertyId: lead.propertyId, action: "lead.follow_up", entity: "leads", entityId: leadId, before: { followUpOn: lead.followUpOn }, after: { followUpOn } });
    refresh();
    return { done: followUpOn ? "Follow-up set." : "Follow-up cleared." };
  } catch (error) {
    return problem(error, "Your role can't work leads at this resort.");
  }
}

/** A note on the lead's timeline, such as what the guest said on the phone. */
export async function addLeadNote(leadId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const { lead, staff } = await workable(leadId);
    const { note } = z.object({ note: z.string().trim().min(2, "Write the note first.").max(2000) }).parse(filled(form));
    const db = getDb();
    await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: "note", note });
    // A first note means someone has been in touch.
    if (lead.status === "new") {
      await db.update(leads).set({ status: "contacted" }).where(and(eq(leads.id, leadId), eq(leads.status, "new")));
      await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: "status", data: { from: "new", to: "contacted" } });
    } else {
      await db.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, leadId));
    }
    await audit({ userId: staff.userId, propertyId: lead.propertyId, action: "lead.note", entity: "leads", entityId: leadId, after: { note } });
    refresh();
    return { done: "Note added." };
  } catch (error) {
    return problem(error, "Your role can't work leads at this resort.");
  }
}

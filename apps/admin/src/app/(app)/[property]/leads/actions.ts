"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, leadActivities, leadAssignmentRules, leads, properties } from "@repo/db";
import { mergeLeads, NotFoundError, normalisePhone, RuleError } from "@repo/engine";
import { date, filled, problem, rupeesField, wholeNumber, type FormState } from "@/lib/forms";
import { leadStatusLabel } from "@/lib/format";
import { leadWorkers } from "@/lib/leads";
import { audit, requirePermission } from "@/lib/staff";

const statuses = ["new", "contacted", "site_visit_scheduled", "site_visit_done", "quoted", "negotiation", "won", "lost"] as const;
const interests = ["stay", "day", "wedding", "corporate", "event", "other"] as const;
const time = z.string().regex(/^\d{2}:\d{2}$/, "Write the time as hh:mm.");
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
  followUpTime: time.optional(),
  budget: z.string().trim().max(80).optional(),
  estimatedValue: rupeesField("The estimated value").optional(),
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
    const { estimatedValue, ...rest } = input;
    const [lead] = await db
      .insert(leads)
      .values({ propertyId, ...rest, estimatedValuePaise: estimatedValue ?? null, phone: normalisePhone(input.phone), assignedTo: staff.userId, createdBy: staff.userId })
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

/** The day, and optionally the time, someone should get back to the guest (CRM-04). Empty clears it. */
export async function setFollowUp(leadId: string, day: string | null, at: string | null = null): Promise<FormState> {
  try {
    const { lead, staff } = await workable(leadId);
    const followUpOn = day ? date("follow-up date").parse(day) : null;
    const followUpTime = followUpOn && at ? time.parse(at) : null;
    const db = getDb();
    await db.update(leads).set({ followUpOn, followUpTime }).where(eq(leads.id, leadId));
    await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: "follow_up", data: { from: lead.followUpOn, to: followUpOn, time: followUpTime } });
    await audit({ userId: staff.userId, propertyId: lead.propertyId, action: "lead.follow_up", entity: "leads", entityId: leadId, before: { followUpOn: lead.followUpOn, followUpTime: lead.followUpTime }, after: { followUpOn, followUpTime } });
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

const detailsInput = z.object({
  name: z.string().trim().min(2, "Write the guest's name.").max(80),
  phone: z.string().trim().max(30).optional(),
  email: z.email("Check the email address.").optional(),
  interest: z.enum(interests),
  dateFrom: date("date").optional(),
  dateTo: date("last date").optional(),
  guests: wholeNumber("The number of guests", 1, 5000).optional(),
  budget: z.string().trim().max(80).optional(),
  estimatedValue: rupeesField("The estimated value").optional(),
});

/** Changes what the lead is: who, what, when, how many, budget and estimated value. */
export async function updateLeadDetails(leadId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const { lead, staff } = await workable(leadId);
    const input = detailsInput.parse(filled(form));
    if (!input.phone && !input.email) return { error: "Keep a phone number or an email, so the team can reply." };
    const values = {
      name: input.name,
      phone: normalisePhone(input.phone),
      email: input.email ?? null,
      interest: input.interest,
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
      guests: input.guests ?? null,
      budget: input.budget ?? null,
      estimatedValuePaise: input.estimatedValue ?? null,
    };
    const db = getDb();
    const [after] = await db.update(leads).set(values).where(eq(leads.id, leadId)).returning();
    await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: "details" });
    await audit({ userId: staff.userId, propertyId: lead.propertyId, action: "lead.update", entity: "leads", entityId: leadId, before: lead, after });
    refresh();
    return { done: "Saved." };
  } catch (error) {
    return problem(error, "Your role can't work leads at this resort.");
  }
}

/** Moves a lead to another stage, as dragged on the board (CRM-01). Lost needs a reason; booked needs a booking. */
export async function moveLead(leadId: string, status: string, reason?: string): Promise<FormState> {
  const form = new FormData();
  form.set("status", status);
  if (reason) form.set("reason", reason);
  return setLeadStatus(leadId, {}, form);
}

/** A call, a WhatsApp message or a meeting with the guest, on the timeline (CRM-05). A first one means contacted. */
export async function logLeadActivity(leadId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const { lead, staff } = await workable(leadId);
    const input = z
      .object({ kind: z.enum(["call", "whatsapp", "email", "meeting"]), note: z.string().trim().min(2, "Say what was said.").max(2000) })
      .parse(filled(form));
    const db = getDb();
    await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: input.kind, note: input.note });
    if (lead.status === "new") {
      await db.update(leads).set({ status: "contacted" }).where(and(eq(leads.id, leadId), eq(leads.status, "new")));
      await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: "status", data: { from: "new", to: "contacted" } });
    } else {
      await db.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, leadId));
    }
    await audit({ userId: staff.userId, propertyId: lead.propertyId, action: `lead.${input.kind}`, entity: "leads", entityId: leadId, after: input });
    refresh();
    return { done: "Added to the timeline." };
  } catch (error) {
    return problem(error, "Your role can't work leads at this resort.");
  }
}

/**
 * An advance taken against a lead before it is booked, such as a wedding's
 * (CRM-08). It shows on the lead; when the booking is made, record it there
 * as a payment.
 */
export async function recordLeadAdvance(leadId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const { lead, staff } = await workable(leadId);
    const input = z
      .object({
        amount: rupeesField("The amount"),
        method: z.enum(["cash", "upi", "card", "bank_transfer", "cheque", "other"]),
        reference: z.string().trim().max(80).optional(),
      })
      .refine((v) => v.amount > 0, { error: "The amount must be more than zero." })
      .parse(filled(form));
    if (lead.bookingId) throw new RuleError("This lead is booked: record the payment on its booking.");
    const db = getDb();
    await db.update(leads).set({ advancePaise: lead.advancePaise + input.amount }).where(eq(leads.id, leadId));
    await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: "advance", note: input.reference ?? null, data: { amountPaise: input.amount, method: input.method } });
    await audit({ userId: staff.userId, propertyId: lead.propertyId, action: "lead.advance", entity: "leads", entityId: leadId, before: { advancePaise: lead.advancePaise }, after: { advancePaise: lead.advancePaise + input.amount, method: input.method, reference: input.reference } });
    refresh();
    return { done: "Advance recorded." };
  } catch (error) {
    return problem(error, "Your role can't work leads at this resort.");
  }
}

/** Merges a duplicate lead from the same phone into this one (CRM-06). */
export async function mergeLeadInto(keepId: string, mergeId: string): Promise<FormState> {
  try {
    const { lead, staff } = await workable(keepId);
    z.uuid().parse(mergeId);
    const { gone } = await mergeLeads(getDb(), { keepId, mergeId, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId: lead.propertyId, action: "lead.merge", entity: "leads", entityId: keepId, before: gone, after: { mergedInto: keepId } });
    refresh();
    return { done: `Merged ${gone.name}'s other lead into this one.` };
  } catch (error) {
    return problem(error, "Your role can't work leads at this resort.");
  }
}

const quoteLine = z.object({ title: z.string().trim().min(1).max(160), quantity: z.number().int().min(1).max(10000), ratePaise: z.number().int().min(0).max(10_000_000_000) });

/**
 * Saves a quotation for the lead (CRM-09) and moves it to Quotation sent.
 * Its printable page makes the PDF. Each quotation is kept on the timeline.
 */
export async function saveQuotation(leadId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    const { lead, staff } = await workable(leadId);
    const lines = z.array(quoteLine).min(1, "Add at least one line.").max(40).parse(JSON.parse(String(form.get("lines") ?? "[]")));
    const extra = z
      .object({ validUntil: date("valid until date").optional(), notes: z.string().trim().max(2000).optional(), gstPercent: wholeNumber("GST", 0, 28).optional() })
      .parse(filled(form));
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.ratePaise, 0);
    const db = getDb();
    const [activity] = await db
      .insert(leadActivities)
      .values({ leadId, userId: staff.userId, type: "quotation", data: { lines, subtotalPaise: subtotal, gstPercent: extra.gstPercent ?? 0, validUntil: extra.validUntil ?? null, notes: extra.notes ?? null } })
      .returning({ id: leadActivities.id });
    const moves = ["new", "contacted", "site_visit_scheduled", "site_visit_done"].includes(lead.status);
    await db
      .update(leads)
      .set({ ...(moves ? { status: "quoted" as const } : {}), estimatedValuePaise: lead.estimatedValuePaise ?? subtotal })
      .where(eq(leads.id, leadId));
    if (moves) await db.insert(leadActivities).values({ leadId, userId: staff.userId, type: "status", data: { from: lead.status, to: "quoted" } });
    await audit({ userId: staff.userId, propertyId: lead.propertyId, action: "lead.quotation", entity: "leads", entityId: leadId, after: { lines, subtotal, ...extra } });
    refresh();
    return { done: `Quotation ${activity.id} saved. Open it to print or save as PDF.` };
  } catch (error) {
    if (error instanceof SyntaxError) return { error: "Add at least one line." };
    return problem(error, "Your role can't work leads at this resort.");
  }
}

/**
 * Who new leads go to (CRM-02): for each kind of lead, or for all, the
 * staff taken in turn. An empty list removes the rule.
 */
export async function saveAssignmentRule(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("leads.manage", propertyId);
    const interest = z.enum([...interests, "all"]).parse(form.get("interest") ?? "all");
    const userIds = z.array(z.string().min(1).max(100)).max(50).parse(form.getAll("userIds").filter((v) => v !== ""));
    const workers = new Set((await leadWorkers(propertyId)).map((w) => w.id));
    if (userIds.some((id) => !workers.has(id))) throw new RuleError("Leads can only go to staff who work leads at this resort.");
    const db = getDb();
    const value = interest === "all" ? null : interest;
    const match = and(eq(leadAssignmentRules.propertyId, propertyId), value === null ? undefined : eq(leadAssignmentRules.interest, value));
    const existing = (await db.select().from(leadAssignmentRules).where(match)).filter((r) => r.interest === value);
    if (userIds.length === 0) {
      if (existing.length) await db.delete(leadAssignmentRules).where(inArray(leadAssignmentRules.id, existing.map((r) => r.id)));
    } else if (existing.length) {
      await db.update(leadAssignmentRules).set({ userIds, nextIndex: 0 }).where(eq(leadAssignmentRules.id, existing[0].id));
    } else {
      await db.insert(leadAssignmentRules).values({ propertyId, interest: value, userIds, createdBy: staff.userId });
    }
    await audit({ userId: staff.userId, propertyId, action: "lead.assignment_rule", entity: "lead_assignment_rules", before: existing[0] ?? null, after: { interest: value, userIds } });
    refresh();
    return { done: userIds.length ? "New leads will go to them in turn." : "Rule removed." };
  } catch (error) {
    return problem(error, "Your role can't change who gets leads at this resort.");
  }
}

"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, messageTemplates } from "@repo/db";
import { templateKinds } from "@repo/engine";
import { checkbox, filled, problem, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";

const kinds = Object.keys(templateKinds) as [string, ...string[]];

/** Saves a resort's wording for one kind of email (NOT-01). Empty subject and text go back to the standard wording. */
export async function saveTemplate(propertyId: string, kind: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    z.enum(kinds).parse(kind);
    const staff = await requirePermission("settings.manage", propertyId);
    const input = z
      .object({ subject: z.string().trim().max(200).optional(), body: z.string().trim().max(3000).optional(), active: checkbox })
      .parse(filled(form));
    const db = getDb();
    const where = and(eq(messageTemplates.propertyId, propertyId), eq(messageTemplates.kind, kind), eq(messageTemplates.channel, "email"));
    const [before] = await db.select().from(messageTemplates).where(where);
    if (!input.subject && !input.body) {
      if (before) await db.delete(messageTemplates).where(eq(messageTemplates.id, before.id));
      await audit({ userId: staff.userId, propertyId, action: "template.reset", entity: "message_templates", entityId: before?.id, before: before ?? null });
      refresh();
      return { done: "Back to the standard wording." };
    }
    if (!input.subject || !input.body) return { error: "Write both the subject and the text, or clear both for the standard wording." };
    const unknown = [...`${input.subject} ${input.body}`.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).filter((f) => !templateKinds[kind as keyof typeof templateKinds].fields.includes(f));
    if (unknown.length) return { error: `This email has no field called ${[...new Set(unknown)].map((f) => `{{${f}}}`).join(", ")}.` };
    const [after] = await db
      .insert(messageTemplates)
      .values({ propertyId, kind, channel: "email", subject: input.subject, body: input.body, active: input.active, createdBy: staff.userId })
      .onConflictDoUpdate({ target: [messageTemplates.propertyId, messageTemplates.kind, messageTemplates.channel], set: { subject: input.subject, body: input.body, active: input.active } })
      .returning();
    await audit({ userId: staff.userId, propertyId, action: "template.save", entity: "message_templates", entityId: after.id, before: before ?? null, after });
    refresh();
    return { done: "Wording saved." };
  } catch (error) {
    return problem(error, "Only a Super Admin can change the resort's messages.");
  }
}

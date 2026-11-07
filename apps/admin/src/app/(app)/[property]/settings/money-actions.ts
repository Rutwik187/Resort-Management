"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { cancellationRules, getDb, taxRules } from "@repo/db";
import { savePaymentAccount } from "@repo/engine";
import { checkbox, date, filled, problem, rupeesField, wholeNumber, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";

const forbidden = "Only a Super Admin can change payments, GST and cancellation rules.";

/** A resort's own Razorpay keys. Blank secrets keep the saved ones. */
export async function savePayments(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("settings.manage", propertyId);
    const input = z
      .object({ keyId: z.string().trim().min(1, "Enter the key id."), keySecret: z.string().optional(), webhookSecret: z.string().optional(), active: checkbox })
      .parse(filled(form));
    await savePaymentAccount(getDb(), { propertyId, ...input, userId: staff.userId });
    // Never the secrets themselves.
    await audit({ userId: staff.userId, propertyId, action: "payments.keys", entity: "payment_accounts", entityId: propertyId, after: { keyId: input.keyId, active: input.active, secretChanged: Boolean(input.keySecret), webhookChanged: Boolean(input.webhookSecret) } });
    refresh();
    return { done: "Payment keys saved." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

const taxInput = z.object({
  appliesTo: z.enum(["room", "offering", "addon"], { error: "Choose what the rule covers." }),
  label: z.string().trim().min(3, "Name the rule, such as Rooms up to ₹7,500.").max(120),
  sac: z.string().trim().regex(/^\d{4,8}$/, "The SAC code has 4 to 8 digits.").optional(),
  from: rupeesField("From").optional(),
  to: rupeesField("Up to").optional(),
  rate: z.coerce.number({ error: "The rate must be a number." }).min(0, "The rate can't be below 0%.").max(28, "GST is at most 28%."),
  startsOn: date("first day"),
});

/** Adds a GST rule. Rules are never edited: a new rate is a new rule from its first day. */
export async function addTaxRule(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("settings.manage", propertyId);
    const input = taxInput.parse(filled(form));
    if (input.to !== undefined && input.from !== undefined && input.to < input.from) return { error: "Up to must be more than From." };
    const [row] = await getDb()
      .insert(taxRules)
      .values({
        propertyId,
        appliesTo: input.appliesTo,
        label: input.label,
        sac: input.sac ?? null,
        minUnitPaise: input.from ?? 0,
        maxUnitPaise: input.to ?? null,
        rateBps: Math.round(input.rate * 100),
        startsOn: input.startsOn,
        createdBy: staff.userId,
      })
      .returning();
    await audit({ userId: staff.userId, propertyId, action: "tax_rule.create", entity: "tax_rules", entityId: row.id, after: row });
    refresh();
    return { done: "GST rule added." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Removes a GST rule added by mistake. Invoices already issued keep their rates. */
export async function removeTaxRule(propertyId: string, ruleId: string): Promise<FormState> {
  try {
    const staff = await requirePermission("settings.manage", propertyId);
    const [row] = await getDb().delete(taxRules).where(and(eq(taxRules.id, ruleId), eq(taxRules.propertyId, propertyId))).returning();
    if (row) await audit({ userId: staff.userId, propertyId, action: "tax_rule.delete", entity: "tax_rules", entityId: row.id, before: row });
    refresh();
    return { done: "GST rule removed." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Adds a cancellation rule, or replaces the one with the same days. */
export async function saveCancellationRule(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("settings.manage", propertyId);
    const input = z
      .object({
        appliesTo: z.enum(["stay", "day", "any"]),
        daysBefore: wholeNumber("Days before arrival", 0, 365),
        refundPercent: wholeNumber("The refund", 0, 100),
      })
      .parse(filled(form));
    const [row] = await getDb()
      .insert(cancellationRules)
      .values({ propertyId, ...input, createdBy: staff.userId })
      .onConflictDoUpdate({ target: [cancellationRules.propertyId, cancellationRules.appliesTo, cancellationRules.daysBefore], set: { refundPercent: input.refundPercent } })
      .returning();
    await audit({ userId: staff.userId, propertyId, action: "cancellation_rule.save", entity: "cancellation_rules", entityId: row.id, after: row });
    refresh();
    return { done: "Cancellation rule saved." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

export async function removeCancellationRule(propertyId: string, ruleId: string): Promise<FormState> {
  try {
    const staff = await requirePermission("settings.manage", propertyId);
    const [row] = await getDb().delete(cancellationRules).where(and(eq(cancellationRules.id, ruleId), eq(cancellationRules.propertyId, propertyId))).returning();
    if (row) await audit({ userId: staff.userId, propertyId, action: "cancellation_rule.delete", entity: "cancellation_rules", entityId: row.id, before: row });
    refresh();
    return { done: "Cancellation rule removed." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

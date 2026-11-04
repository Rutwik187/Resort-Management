import "server-only";
import { z } from "zod";
import { ForbiddenError } from "@repo/auth";
import { NotFoundError, RuleError, SoldOutError, TransitionError } from "@repo/engine";
import type { FormState } from "@/components/form-note";

export type { FormState };

/** A ticked checkbox sends "on"; an unticked one sends nothing at all. */
export const checkbox = z.literal("on").optional().transform((value) => value === "on");

export const wholeNumber = (label: string, min: number, max: number) =>
  z.coerce
    .number({ error: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .min(min, `${label} can't be below ${min}.`)
    .max(max, `${label} can't be above ${max}.`);

/** Rupees as typed, such as 4500 or 4,500.50, turned into paise. */
export const rupeesField = (label: string) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(/[₹,\s]/g, ""))
    .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, `${label}: write an amount in rupees, such as 4500 or 4500.50.`))
    .transform((value) => Math.round(Number(value) * 100));

export const date = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Choose the ${label}.`);

/** The form's fields without the empty ones, so optional fields read as missing. */
export const filled = (form: FormData) => Object.fromEntries([...form].filter(([, value]) => value !== ""));

/**
 * Turns an expected failure into words for the form: a bad field, a rule
 * the engine applied, or a permission the person lacks. Anything else is a
 * real fault and is thrown.
 */
export function problem(error: unknown, forbidden = "Your role can't do this at this resort."): FormState {
  if (error instanceof z.ZodError) return { error: error.issues[0]?.message ?? "Check the form." };
  if (error instanceof ForbiddenError) return { error: forbidden };
  if (error instanceof RuleError || error instanceof SoldOutError || error instanceof TransitionError || error instanceof NotFoundError || error instanceof RangeError) {
    return { error: error.message };
  }
  throw error;
}

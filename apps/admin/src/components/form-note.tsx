"use client";

import { useActionState } from "react";
import { toast } from "sonner";

/** What a form's server action gives back: an error to show, or a short success note. */
export type FormState = { error?: string; done?: string } | undefined;

/** The line under a form that says what went wrong. Successes show as a toast (useToastAction). */
export function FormNote({ state, showDone = false }: { state: FormState; showDone?: boolean }) {
  if (!state || (!state.error && !showDone)) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-destructive" : "text-good"}`}>
      {state.error ?? state.done}
    </p>
  );
}

/**
 * useActionState for a form whose server action returns FormState. A
 * success shows as a toast, then onDone runs, such as closing the dialog.
 * The toast fires from the action itself, not from an effect, so it shows
 * even when the success removes the form, as cancelling a booking does.
 */
export function useToastAction(action: (state: FormState, form: FormData) => Promise<FormState>, onDone?: () => void) {
  return useActionState(async (state: FormState, form: FormData) => {
    const result = await action(state, form);
    if (result?.done) {
      toast.success(result.done);
      onDone?.();
    }
    return result;
  }, undefined);
}

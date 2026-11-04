"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** What a form's server action gives back: an error to show, or a short success note. */
export type FormState = { error?: string; done?: string } | undefined;

/** The line under a form that says what went wrong. Successes show as a toast (useFormFeedback). */
export function FormNote({ state, showDone = false }: { state: FormState; showDone?: boolean }) {
  if (!state || (!state.error && !showDone)) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-destructive" : "text-good"}`}>
      {state.error ?? state.done}
    </p>
  );
}

/** Shows a toast when a form succeeds, then runs onDone, such as closing its dialog. */
export function useFormFeedback(state: FormState, onDone?: () => void) {
  const last = useRef<FormState>(undefined);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.done) {
      toast.success(state.done);
      onDone?.();
    }
  }, [state, onDone]);
}

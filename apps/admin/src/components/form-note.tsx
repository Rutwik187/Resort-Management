/** What a form's server action gives back: an error to show, or a short success note. */
export type FormState = { error?: string; done?: string } | undefined;

/** The line under a form that says what happened. */
export function FormNote({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-[0.88rem] ${state.error ? "text-danger" : "text-good"}`}>
      {state.error ?? state.done}
    </p>
  );
}

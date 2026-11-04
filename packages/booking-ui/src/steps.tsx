type StepsProps = {
  /** The steps in order, with how far the guest has come. */
  steps: { label: string; done: boolean }[];
};

/**
 * How booking works, in three steps, and where the guest is now: the first
 * step not yet done is the current one.
 */
export function Steps({ steps }: StepsProps) {
  const current = steps.findIndex((step) => !step.done);
  return (
    <ol aria-label="How to book" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.88rem] text-bk-ink">
      {steps.map((step, i) => (
        <li key={step.label} aria-current={i === current ? "step" : undefined} className="flex items-center gap-2">
          <span
            aria-hidden
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-semibold tabular-nums ${
              step.done ? "bg-bk-good text-white" : i === current ? "bg-bk-ink text-bk-card" : "border border-bk-line text-bk-muted"
            }`}
          >
            {step.done ? "✓" : i + 1}
          </span>
          <span className={i === current || step.done ? "" : "text-bk-muted"}>
            {step.label}
            {step.done && <span className="sr-only"> (done)</span>}
          </span>
          {i < steps.length - 1 && <span aria-hidden className="ml-1 hidden h-px w-8 bg-bk-line sm:block" />}
        </li>
      ))}
    </ol>
  );
}

"use client";

import { useId } from "react";

type StepperProps = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

const button =
  "flex size-11 items-center justify-center rounded-full border border-bk-line text-[1.25rem] leading-none transition-colors hover:border-bk-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-bk-line";

/** A count with minus and plus buttons, for guests and rooms. */
export function Stepper({ label, hint, value, min, max, onChange }: StepperProps) {
  const id = useId();
  // "Children, 5 to 11", so two rows called "Children" never share a button name.
  const name = hint ? `${label}, ${hint}` : label;
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div id={id}>
        <p className="leading-tight">{label}</p>
        {hint && <p className="mt-0.5 text-[0.82rem] leading-tight text-bk-muted">{hint}</p>}
      </div>
      <div role="group" aria-labelledby={id} className="flex shrink-0 items-center gap-1.5">
        <button type="button" className={button} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${name}: one fewer`}>
          <span aria-hidden>−</span>
        </button>
        <output aria-live="polite" className="w-7 text-center text-[1.05rem] tabular-nums">
          {value}
        </output>
        <button type="button" className={button} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${name}: one more`}>
          <span aria-hidden>+</span>
        </button>
      </div>
    </div>
  );
}

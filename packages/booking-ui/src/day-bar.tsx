"use client";

import Form from "next/form";
import { useSyncExternalStore } from "react";
import { todayInIndia } from "./dates";
import { dayParam } from "./params";

const noop = () => () => {};

type DayBarProps = {
  /** The day-pass page, which opens with the date chosen here. */
  action: string;
  submitLabel?: string;
  className?: string;
};

/**
 * The date of a day visit, then on to the passes. A plain form, so it works
 * before scripts load; with them, Next.js moves to the page without a reload.
 */
export function DayBar({ action, submitLabel = "See day passes", className = "" }: DayBarProps) {
  const today = useSyncExternalStore(noop, () => todayInIndia(), () => "");
  return (
    <Form
      action={action}
      aria-label="Choose the date of your visit"
      className={`grid grid-cols-1 rounded-bk border border-bk-line bg-bk-card text-bk-ink shadow-[0_12px_40px_-24px_rgb(0_0_0/0.4)] sm:grid-cols-[1fr_auto] ${className}`}
    >
      <label className="relative flex min-h-[4.25rem] flex-col justify-center border-b border-bk-line px-4 py-2.5 sm:border-b-0 sm:border-r">
        <span className="text-[0.78rem] leading-none text-bk-muted">Date of your visit</span>
        <input
          type="date"
          name={dayParam}
          required
          min={today || undefined}
          className="mt-1.5 w-full min-w-0 appearance-none bg-transparent text-[1rem] leading-tight text-bk-ink outline-none [color-scheme:light]"
        />
      </label>
      <div className="p-2">
        <button
          type="submit"
          className="flex h-full min-h-12 w-full items-center justify-center rounded-[max(0px,calc(var(--bk-radius)-0.35rem))] bg-bk-accent px-6 bk-button text-bk-accent-ink transition-opacity hover:opacity-90"
        >
          {submitLabel}
        </button>
      </div>
    </Form>
  );
}

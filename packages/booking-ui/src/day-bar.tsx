"use client";

import Form from "next/form";
import { useState } from "react";
import { DateField, useToday } from "./date-field";
import { dayParam } from "./params";

type DayBarProps = {
  /** The day-pass page, which opens with the date chosen here. */
  action: string;
  submitLabel?: string;
  className?: string;
};

/**
 * The date of a day visit, then on to the passes. A plain form, so it works
 * before scripts load; with them, Next.js moves to the page without a reload.
 * Sent without a date, it opens the calendar instead.
 */
export function DayBar({ action, submitLabel = "See day passes", className = "" }: DayBarProps) {
  const today = useToday();
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);
  const [missing, setMissing] = useState(false);
  return (
    <Form
      action={action}
      aria-label="Choose the date of your visit"
      onSubmit={(event) => {
        if (date) return;
        event.preventDefault();
        setMissing(true);
        setOpen(true);
      }}
      className={`grid grid-cols-1 rounded-bk border bg-bk-card text-bk-ink shadow-[0_12px_40px_-24px_rgb(0_0_0/0.4)] sm:grid-cols-[1fr_auto] ${
        missing && !date ? "border-bk-alert" : "border-bk-line"
      } ${className}`}
    >
      <DateField
        label="Date of your visit"
        name={dayParam}
        value={date}
        min={today || undefined}
        onChange={(next) => {
          setDate(next);
          setMissing(false);
        }}
        message={missing && !date ? "Choose the date of your visit first." : undefined}
        open={open}
        onOpenChange={setOpen}
        className="rounded-t-[calc(var(--bk-radius)-1px)] border-b border-bk-line sm:rounded-l-[calc(var(--bk-radius)-1px)] sm:rounded-tr-none sm:border-b-0 sm:border-r"
      />
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

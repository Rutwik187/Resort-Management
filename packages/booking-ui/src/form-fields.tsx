"use client";

import { useRef, useState } from "react";
import { Calendar } from "./calendar";
import { CalendarMark, Popover, useDismiss } from "./date-field";
import { formatDay, formatLong } from "./dates";
import { useToday } from "./use-today";

/*
 * Form parts for the sites' own enquiry forms, in place of the browser's
 * date picker, number spinners and "Please fill out this field" bubbles.
 * Each takes the form's own field classes, so it looks like the fields
 * around it.
 */

type DateInputProps = {
  /** Matches the field's <label htmlFor>. */
  id: string;
  /** What the field asks for, such as "Wedding date", for screen readers. */
  label: string;
  /** The form field's name. The form sends yyyy-mm-dd. */
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** The form's own field classes. */
  className?: string;
};

/** A date in a form, chosen on the site's own calendar. */
export function DateInput({ id, label, name, value, onChange, placeholder = "Choose a date", className = "" }: DateInputProps) {
  const today = useToday();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useDismiss(open, boxRef, () => setOpen(false), buttonRef);

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${value ? formatLong(value) : "not chosen"}`}
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-3 text-left ${className}`}
      >
        <span className={value ? "" : "opacity-60"}>{value ? formatDay(value) : placeholder}</span>
        <CalendarMark />
      </button>
      <input type="hidden" name={name} value={value} />
      {open && (
        <Popover label={`${label}: choose a date`} className="left-0 w-[min(23rem,calc(100vw-2rem))]">
          <Calendar
            start={value}
            min={today || undefined}
            autoFocus
            onPick={(date) => {
              onChange(date);
              setOpen(false);
              buttonRef.current?.focus();
            }}
            actions={
              value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className="min-h-10 px-2 text-bk-muted underline underline-offset-4 hover:text-bk-ink"
                >
                  Clear date
                </button>
              ) : undefined
            }
          />
        </Popover>
      )}
    </div>
  );
}

type CountInputProps = {
  /** Matches the field's <label htmlFor>. */
  id: string;
  /** The field's name in words, for the buttons: "Guests: one more". */
  label: string;
  name?: string;
  /** Digits only, or empty when the guest has not said. */
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  /** The form's own field classes, for the box with the number. */
  className?: string;
};

const stepButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full border border-bk-line text-[1.25rem] leading-none text-bk-ink transition-colors hover:border-bk-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-bk-line";

/**
 * A count, such as guests or students: minus and plus for small changes,
 * and the number can be typed for large groups. Only digits go in.
 */
export function CountInput({ id, label, name, value, onChange, min = 0, max = 9999, className = "" }: CountInputProps) {
  const number = value === "" ? null : Number(value);
  const set = (next: number) => onChange(String(Math.min(max, Math.max(min, next))));
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={stepButton} disabled={number === null || number <= min} onClick={() => number !== null && set(number - 1)} aria-label={`${label}: one fewer`}>
        <span aria-hidden>−</span>
      </button>
      <input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, String(max).length))}
        onBlur={() => number !== null && set(number)}
        className={`min-w-0 flex-1 text-center tabular-nums ${className}`}
      />
      <button type="button" className={stepButton} disabled={number !== null && number >= max} onClick={() => set(number === null ? Math.max(min, 1) : number + 1)} aria-label={`${label}: one more`}>
        <span aria-hidden>+</span>
      </button>
    </div>
  );
}

export type ContactErrors = { name?: string; phone?: string };

/** Checks a guest's name and phone, with messages in plain words. Empty when both are fine. */
export function contactErrors(name: string, phone: string): ContactErrors {
  const errors: ContactErrors = {};
  if (!name.trim()) errors.name = "Please write your name.";
  if (!phone.trim()) errors.phone = "Please write your phone number.";
  else if (phone.replace(/\D/g, "").length < 8 || /[^\d+\s-]/.test(phone)) errors.phone = "Please check the number. It needs at least 8 digits.";
  return errors;
}

/** The message under a field that needs fixing. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-[0.88rem] text-bk-alert">
      {message}
    </p>
  );
}

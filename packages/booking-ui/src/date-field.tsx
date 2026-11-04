"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode, type Ref, type RefObject } from "react";
import { Calendar } from "./calendar";
import { formatDay } from "./dates";

export { useToday } from "./use-today";

type DateButtonProps = {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  value: string;
  placeholder?: string;
  /** The calendar is open for this field. */
  active?: boolean;
  onClick: () => void;
  className?: string;
};

/** A date as people say it, "Thu, 12 Nov", in a field that opens the calendar. */
export function DateButton({ ref, label, value, placeholder = "Add date", active = false, onClick, className = "" }: DateButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={active}
      className={`relative flex min-h-[4.25rem] w-full flex-col justify-center px-4 py-2.5 text-left outline-offset-[-4px] transition-colors focus-visible:outline-2 focus-visible:outline-bk-ink ${
        active ? "bg-bk-soft" : "hover:bg-bk-soft/60"
      } ${className}`}
    >
      <span className="text-[0.78rem] leading-none text-bk-muted">{label}</span>
      <span className={`mt-1.5 flex items-center justify-between gap-2 text-[1rem] leading-tight ${value ? "text-bk-ink" : "text-bk-muted"}`}>
        <span className="truncate">{value ? formatDay(value) : placeholder}</span>
        <CalendarMark />
      </span>
      {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-bk-accent" />}
    </button>
  );
}

/**
 * Closes a pop-up on a click outside `box` or on Escape. Escape also puts
 * focus back on the field that opened it.
 */
export function useDismiss(open: boolean, box: RefObject<HTMLElement | null>, close: () => void, trigger?: RefObject<HTMLElement | null>) {
  const dismiss = useEffectEvent(close);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) dismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Escape closes the pop-up only, not a sheet it sits in.
      event.preventDefault();
      dismiss();
      trigger?.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, box, trigger]);
}

/** The panel that drops under a date field, scrolled into view when it opens. */
export function Popover({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className={`bk-pop absolute top-full z-40 mt-2 scroll-mb-28 rounded-bk border border-bk-line bg-bk-card p-4 text-bk-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)] sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

type DateFieldProps = {
  label: string;
  /** The form field's name, when a form sends the date. */
  name?: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shown at the top of the calendar, such as "Choose the date of your visit first." */
  message?: string;
  /** Lets the form open the calendar, such as when the guest sends it without a date. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/** One date, such as the day of a visit, chosen on the site's own calendar. */
export function DateField({ label, name, value, min, onChange, placeholder, message, open: openProp, onOpenChange, className = "" }: DateFieldProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const setOpen = onOpenChange ?? setOwnOpen;
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useDismiss(open, boxRef, () => setOpen(false), buttonRef);

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <DateButton ref={buttonRef} label={label} value={value} placeholder={placeholder} active={open} onClick={() => setOpen(!open)} className="rounded-[inherit]" />
      {name && <input type="hidden" name={name} value={value} />}
      {open && (
        <Popover label={`${label}: choose a date`} className="left-0 w-[min(23rem,calc(100vw-2rem))]">
          {message && (
            <p role="alert" className="mb-3 text-[0.9rem] text-bk-alert">
              {message}
            </p>
          )}
          <Calendar
            start={value}
            min={min}
            autoFocus
            onPick={(date) => {
              onChange(date);
              setOpen(false);
              buttonRef.current?.focus();
            }}
          />
        </Popover>
      )}
    </div>
  );
}

/** A small calendar, beside a date. */
export function CalendarMark() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-[1.1rem] shrink-0 text-bk-muted" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
      <path d="M3 8.5h14M7 2.75v3.5M13 2.75v3.5" strokeLinecap="round" />
    </svg>
  );
}

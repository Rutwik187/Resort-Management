"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { plural } from "./dates";
import { formatRupees } from "./pricing";
import { openWhatsApp, type GuestDetails, type RequestLine } from "./request";
import type { Desk } from "./types";

type Step = "pick" | "details" | "sent";

/** The tray's step and the guest's details, shared by the side tray and the phone sheet. */
export function useCheckout() {
  const [step, setStep] = useState<Step>("pick");
  const [guest, setGuest] = useState<GuestDetails>({ name: "", phone: "", note: "" });
  return { step, setStep, guest, setGuest };
}

export type Checkout = ReturnType<typeof useCheckout>;

type TrayProps = {
  heading: string;
  /** The dates, or a prompt to choose them. */
  when: ReactNode;
  lines: RequestLine[];
  /** Places still to fill, such as "Room 2", from the number of rooms searched for. */
  emptySlots: string[];
  onRemove: (key: string) => void;
  coverage?: { placed: number; wanted: number };
  /** Null when a line has no published rate. */
  total: number | null;
  /** True until the guest chooses dates, so nothing can be priced yet. */
  pending?: boolean;
  notes?: string[];
  /** Why the guest can't continue yet, or null when they can. */
  blocker: string | null;
  desk: Desk;
  message: (guest: GuestDetails) => string;
  checkout: Checkout;
};

const field =
  "mt-1.5 w-full rounded-bk-control border border-bk-line bg-transparent px-4 py-3 text-[1rem] text-bk-ink outline-none transition-colors placeholder:text-bk-muted/60 focus:border-bk-ink";

/**
 * The guest's selection: each room with who stays in it and its price, the
 * places still to fill, the estimate, and the way to send it. Then the
 * guest's details, and the request goes to the resort on WhatsApp.
 */
export function Tray({ heading, when, lines, emptySlots, onRemove, coverage, total, pending = false, notes = [], blocker, desk, message, checkout }: TrayProps) {
  const id = useId();
  const { step, setStep, guest, setGuest } = checkout;
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new step's heading, so keyboard and screen reader users follow along.
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    if (moved) headingRef.current?.focus();
  }, [step, moved]);
  const go = (next: Step) => {
    setMoved(true);
    setStep(next);
  };

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openWhatsApp(desk.whatsapp.number, message(guest));
    go("sent");
  }

  if (step === "sent") {
    return (
      <section aria-labelledby={`${id}-title`} className="text-bk-ink">
        <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="bk-display text-[1.7rem] outline-none">
          Almost done
        </h2>
        <p className="mt-3 text-[0.95rem] text-bk-muted">
          Your request is ready in WhatsApp. Press send there, and our team replies with availability and the final price.
        </p>
        <div className="mt-6 grid gap-2">
          <button type="button" onClick={() => openWhatsApp(desk.whatsapp.number, message(guest))} className="min-h-12 rounded-bk-control bg-bk-accent px-5 bk-button text-bk-accent-ink">
            Open WhatsApp again
          </button>
          <button type="button" onClick={() => go("pick")} className="min-h-12 rounded-bk-control border border-bk-line px-5 bk-button hover:border-bk-ink">
            Change the request
          </button>
        </div>
        {desk.phone && (
          <p className="mt-6 text-[0.9rem] text-bk-muted">
            Or call{" "}
            <a href={desk.phone.href} className="text-bk-ink underline underline-offset-4">
              {desk.phone.display}
            </a>
          </p>
        )}
      </section>
    );
  }

  if (step === "details") {
    return (
      <section aria-labelledby={`${id}-title`} className="text-bk-ink">
        <button type="button" onClick={() => go("pick")} className="-ml-1 flex min-h-11 items-center gap-2 px-1 text-[0.9rem] text-bk-muted hover:text-bk-ink">
          <span aria-hidden>←</span> Back to your rooms
        </button>
        <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="bk-display mt-2 text-[1.7rem] outline-none">
          Your details
        </h2>
        <p className="mt-2 text-[0.9rem] text-bk-muted">We send your request on WhatsApp to {desk.whatsapp.display}. Nothing is charged now.</p>
        <form onSubmit={send} className="mt-5 grid gap-4">
          <label className="block text-[0.9rem] text-bk-muted">
            Your name
            <input
              required
              autoComplete="name"
              value={guest.name}
              onChange={(event) => setGuest({ ...guest, name: event.target.value })}
              className={field}
            />
          </label>
          <label className="block text-[0.9rem] text-bk-muted">
            Phone number
            <input
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              pattern="[0-9+\s\-]{8,}"
              title="A phone number with at least 8 digits"
              value={guest.phone}
              onChange={(event) => setGuest({ ...guest, phone: event.target.value })}
              className={field}
            />
          </label>
          <label className="block text-[0.9rem] text-bk-muted">
            Anything we should know <span className="text-bk-muted/70">(optional)</span>
            <textarea
              rows={2}
              value={guest.note}
              onChange={(event) => setGuest({ ...guest, note: event.target.value })}
              className={`${field} resize-none rounded-[calc(var(--bk-radius)*0.6)]`}
            />
          </label>
          <button type="submit" className="mt-1 min-h-12 rounded-bk-control bg-bk-accent px-5 bk-button text-bk-accent-ink transition-opacity hover:opacity-90">
            Send booking request
          </button>
        </form>
      </section>
    );
  }

  const placedAll = coverage && coverage.placed >= coverage.wanted;
  return (
    <section aria-labelledby={`${id}-title`} className="text-bk-ink">
      <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="bk-display text-[1.7rem] outline-none">
        {heading}
      </h2>
      <div className="mt-1.5 text-[0.92rem] text-bk-muted">{when}</div>

      <ol className="mt-5 grid gap-2.5">
        {lines.map((line, i) => (
          <li key={line.key} className="flex items-start gap-3 rounded-[calc(var(--bk-radius)*0.7)] border border-bk-line bg-bk-soft/60 p-3">
            <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-bk-ink text-[0.72rem] font-semibold tabular-nums text-bk-card">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="leading-snug">{line.title}</p>
              <p className="mt-0.5 text-[0.82rem] leading-snug text-bk-muted">{line.detail}</p>
              <p className="mt-1.5 text-[0.92rem] tabular-nums">
                {pending ? <span className="text-bk-muted">Add dates for the price</span> : line.amount === null ? <span className="text-bk-muted">Rate to confirm</span> : formatRupees(line.amount)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(line.key)}
              aria-label={`Remove ${line.title}`}
              className="-mr-1 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-full text-[1.1rem] text-bk-muted hover:bg-bk-ink/5 hover:text-bk-ink"
            >
              <span aria-hidden>×</span>
            </button>
          </li>
        ))}
        {emptySlots.map((slot) => (
          <li key={slot} className="rounded-[calc(var(--bk-radius)*0.7)] border border-dashed border-bk-line px-3 py-3.5 text-[0.9rem] text-bk-muted">
            {slot}: not chosen yet
          </li>
        ))}
      </ol>

      {coverage && coverage.wanted > 0 && lines.length > 0 && (
        <div className="mt-4">
          <p className={`text-[0.88rem] ${placedAll ? "text-bk-good" : "text-bk-alert"}`}>
            {placedAll
              ? `Room for all ${plural(coverage.wanted, "guest")}`
              : `Fits ${coverage.placed} of ${plural(coverage.wanted, "guest")}. Add a room for the other ${coverage.wanted - coverage.placed}.`}
          </p>
          <div aria-hidden className="mt-2 h-1 overflow-hidden rounded-full bg-bk-line">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${placedAll ? "bg-bk-good" : "bg-bk-alert"}`}
              style={{ width: `${Math.min(100, (coverage.placed / coverage.wanted) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {lines.length > 0 && !pending && (
        <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-bk-line pt-4">
          <span className="text-[0.92rem] text-bk-muted">Estimate</span>
          <span className="text-right">
            <span className="bk-display block text-[1.75rem] leading-none tabular-nums">{total === null ? "To confirm" : formatRupees(total)}</span>
            <span className="mt-1 block text-[0.78rem] text-bk-muted">{total === null ? "Some rates are quoted by our team" : "Plus GST"}</span>
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => go("details")}
        disabled={Boolean(blocker)}
        className="mt-5 min-h-12 w-full rounded-bk-control bg-bk-accent px-5 bk-button text-bk-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
      >
        Continue
      </button>
      {blocker && <p className="mt-2 text-center text-[0.85rem] text-bk-muted">{blocker}</p>}

      {notes.length > 0 && (
        <ul className="mt-5 grid gap-1.5 border-t border-bk-line pt-4 text-[0.8rem] leading-snug text-bk-muted">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

type TrayDockProps = {
  /** "2 rooms" or "No rooms yet" */
  summary: string;
  total: number | null;
  children: ReactNode;
};

/**
 * On phones the tray waits in a bar at the foot of the screen and opens as
 * a sheet. On large screens the page shows the tray beside the list instead.
 */
export function TrayDock({ summary, total, children }: TrayDockProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [bump, setBump] = useState(0);
  const [lastSummary, setLastSummary] = useState(summary);

  // A short pulse when the selection changes, so the guest sees where it went.
  if (summary !== lastSummary) {
    setLastSummary(summary);
    setBump((n) => n + 1);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      document.documentElement.style.overflow = "";
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  const open = () => {
    dialogRef.current?.showModal();
    document.documentElement.style.overflow = "hidden";
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-bk-line bg-bk-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-bk-ink backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <p key={bump} className="bk-pulse min-w-0">
            <span className="block truncate text-[0.9rem]">{summary}</span>
            {total !== null && <span className="bk-display block text-[1.25rem] leading-tight tabular-nums">{formatRupees(total)}</span>}
          </p>
          <button type="button" onClick={open} className="min-h-12 shrink-0 rounded-bk-control bg-bk-accent px-6 bk-button text-bk-accent-ink">
            View and book
          </button>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        aria-label="Your selection"
        className="bk-sheet m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-[calc(var(--bk-radius)*1.4)] bg-bk-card p-0 text-bk-ink lg:hidden"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div data-lenis-prevent className="max-h-[88dvh] overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
          <div className="sticky top-0 z-10 -mx-5 flex justify-end bg-bk-card px-3 pb-1">
            <button type="button" onClick={() => dialogRef.current?.close()} className="flex min-h-11 items-center gap-2 px-2 text-[0.9rem] text-bk-muted">
              Close <span aria-hidden>×</span>
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}

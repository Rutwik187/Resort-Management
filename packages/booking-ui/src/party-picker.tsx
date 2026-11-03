"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { headcount, payingGuests } from "./pricing";
import { Stepper } from "./stepper";
import type { Party } from "./types";

type PartyPickerProps = {
  /** "Who stays in room 2?" */
  title: string;
  party: Party;
  onChange: (party: Party) => void;
  /** Without a published limit, the picker allows a large group and makes no claim. */
  maxGuests?: number;
  minGuests?: number;
  /** The live price for this party, or a note when it can't be priced. */
  price: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Asks who will stay in the room (or come on the pass) before it is added,
 * as MakeMyTrip does, so every price in the tray is for real people.
 */
export function PartyPicker({ title, party, onChange, maxGuests, minGuests = 1, price, confirmLabel, onConfirm, onCancel }: PartyPickerProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const room = (maxGuests ?? 60) - headcount(party);
  const short = payingGuests(party) < minGuests;
  const set = (key: keyof Party) => (value: number) => onChange({ ...party, [key]: value });

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      className="rounded-bk border border-bk-ink/20 bg-bk-card p-4 shadow-[0_18px_50px_-20px_rgb(0_0_0/0.35)] sm:p-5"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <h4 ref={headingRef} tabIndex={-1} className="bk-display text-[1.3rem] outline-none">
        {title}
      </h4>
      {maxGuests !== undefined && <p className="mt-1 text-[0.85rem] text-bk-muted">Up to {maxGuests} guests, children included.</p>}
      <div className="mt-2 divide-y divide-bk-line">
        <Stepper label="Adults" hint="12 and over" value={party.adults} min={1} max={party.adults + room} onChange={set("adults")} />
        <Stepper label="Children" hint="5 to 11" value={party.children5to11} min={0} max={party.children5to11 + room} onChange={set("children5to11")} />
        <Stepper label="Children" hint="3 to 5" value={party.children3to5} min={0} max={party.children3to5 + room} onChange={set("children3to5")} />
        <Stepper label="Babies" hint="Under 3, free" value={party.under3} min={0} max={party.under3 + room} onChange={set("under3")} />
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-t border-bk-line pt-4">
        <div className="min-w-0 text-[0.9rem]" aria-live="polite">
          {short ? <span className="text-bk-alert">Needs at least {minGuests} guests aged 3 or more.</span> : price}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="min-h-11 rounded-bk-control px-4 text-[0.9rem] text-bk-muted hover:text-bk-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={short}
            className="min-h-11 rounded-bk-control bg-bk-accent px-5 bk-button text-bk-accent-ink transition-opacity disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

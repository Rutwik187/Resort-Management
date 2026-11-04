"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { PartyFields } from "./party-picker";
import { payingGuests } from "./pricing";
import { Sheet } from "./sheet";
import type { Party, Photo } from "./types";

type PickDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Which place in the stay this fills, such as "Room 2 of 3". */
  eyebrow: string;
  name: string;
  photo?: Photo;
  /** The dates, and a way to set or change them. */
  when: ReactNode;
  /** "Who is staying?" or "Who is coming?" */
  question: string;
  party: Party;
  onParty: (party: Party) => void;
  maxGuests?: number;
  minGuests?: number;
  /** The live price for this party, or a note when it can't be priced. */
  price: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
};

/**
 * Adding a room or a pass: the dates, who comes, and the price, with the
 * button to add it always in view at the foot of the panel.
 */
export function PickDialog({ open, onClose, eyebrow, name, photo, when, question, party, onParty, maxGuests, minGuests = 1, price, confirmLabel, onConfirm }: PickDialogProps) {
  const short = payingGuests(party) < minGuests;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={`${name}: ${question}`}
      center
      footer={
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 text-[0.9rem] leading-snug" aria-live="polite">
            {short ? <span className="text-bk-alert">Needs at least {minGuests} guests aged 3 or more.</span> : price}
          </div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={short}
            className="min-h-12 shrink-0 rounded-bk-control bg-bk-accent px-6 bk-button text-bk-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-3.5 pr-10">
        {photo && (
          <div className="relative size-16 shrink-0 overflow-hidden rounded-[calc(var(--bk-radius)*0.6)] bg-bk-soft">
            <Image src={photo.src} alt="" fill sizes="64px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[0.82rem] text-bk-muted">{eyebrow}</p>
          <h2 data-autofocus tabIndex={-1} className="bk-display mt-0.5 text-[1.5rem] outline-none sm:text-[1.65rem]">
            {name}
          </h2>
        </div>
      </div>

      <div className="mt-5">{when}</div>

      <h3 className="mt-6 text-[1.02rem] font-medium">{question}</h3>
      {maxGuests !== undefined && <p className="mt-0.5 text-[0.85rem] text-bk-muted">Up to {maxGuests} guests, children included.</p>}
      <div className="mt-1">
        <PartyFields party={party} onChange={onParty} maxGuests={maxGuests} />
      </div>
    </Sheet>
  );
}

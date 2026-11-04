"use client";

import { headcount } from "./pricing";
import { Stepper } from "./stepper";
import type { Party } from "./types";

type PartyFieldsProps = {
  party: Party;
  onChange: (party: Party) => void;
  /** Without a published limit, the fields allow a large group and make no claim. */
  maxGuests?: number;
};

/**
 * Who will stay in the room, or come on the pass, by age: adults, two bands
 * of children and babies. Asked before anything is added, as MakeMyTrip
 * does, so every price in the tray is for real people.
 */
export function PartyFields({ party, onChange, maxGuests }: PartyFieldsProps) {
  const room = (maxGuests ?? 60) - headcount(party);
  const set = (key: keyof Party) => (value: number) => onChange({ ...party, [key]: value });
  return (
    <div className="divide-y divide-bk-line">
      <Stepper label="Adults" hint="12 and over" value={party.adults} min={1} max={party.adults + room} onChange={set("adults")} />
      <Stepper label="Children" hint="5 to 11" value={party.children5to11} min={0} max={party.children5to11 + room} onChange={set("children5to11")} />
      <Stepper label="Children" hint="3 to 5" value={party.children3to5} min={0} max={party.children3to5 + room} onChange={set("children3to5")} />
      <Stepper label="Babies" hint="Under 3, free" value={party.under3} min={0} max={party.under3 + room} onChange={set("under3")} />
    </div>
  );
}

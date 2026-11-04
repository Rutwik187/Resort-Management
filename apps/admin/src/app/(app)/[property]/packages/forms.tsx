"use client";

import { useActionState } from "react";
import { FormNote } from "@/components/form-note";
import { addSlot, createOffering, duplicateOffering, setOfferingActive, setSeats, updateOffering, updateSlot } from "./actions";

export type OfferingValues = {
  id: string;
  kind: "day_package" | "activity" | "dining" | "other";
  code: string;
  name: string;
  summary: string | null;
  adultPaise: number;
  soldOn: number[] | null;
  validFrom: string | null;
  validTo: string | null;
  children: Record<string, number>;
};
export type SlotValues = { id: string; label: string; startsAt: string | null; endsAt: string | null; defaultCapacity: number; active: boolean };

const kinds = [
  ["day_package", "Day package"],
  ["activity", "Activity"],
  ["dining", "Meal sitting"],
  ["other", "Other ticket"],
] as const;
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const asRupees = (paise: number | undefined) => (paise === undefined ? "" : String(paise / 100));
const hhmm = (time: string | null) => time?.slice(0, 5) ?? "";

/** Adds a package, activity or sitting with its first slot, or changes one (its code stays). */
export function OfferingForm({ propertyId, bands, offering }: { propertyId: string; bands: { id: string; label: string }[]; offering?: OfferingValues }) {
  const [state, action, pending] = useActionState(offering ? updateOffering.bind(null, offering.id) : createOffering.bind(null, propertyId), undefined);
  const key = offering?.id ?? "new";
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor={`${key}-kind`}>
            What it is
          </label>
          <select id={`${key}-kind`} name="kind" defaultValue={offering?.kind ?? "day_package"} className="field">
            {kinds.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={`${key}-name`}>
            Name
          </label>
          <input id={`${key}-name`} name="name" required defaultValue={offering?.name} placeholder="Morning picnic" className="field" />
        </div>
        <div>
          <label className="label" htmlFor={`${key}-code`}>
            Code
          </label>
          <input id={`${key}-code`} name="code" required={!offering} readOnly={Boolean(offering)} defaultValue={offering?.code} placeholder="morning-picnic" className={`field ${offering ? "text-muted" : ""}`} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`${key}-summary`}>
          What it includes
        </label>
        <textarea id={`${key}-summary`} name="summary" rows={2} defaultValue={offering?.summary ?? ""} placeholder="Breakfast, lunch, hi-tea, the pool and activities" className="field" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor={`${key}-adult`}>
            Adult (₹)
          </label>
          <input id={`${key}-adult`} name="adult" required inputMode="decimal" defaultValue={asRupees(offering?.adultPaise)} className="field" />
        </div>
        {bands.map((band) => (
          <div key={band.id}>
            <label className="label" htmlFor={`${key}-child-${band.id}`}>
              Child, {band.label} (₹)
            </label>
            <input id={`${key}-child-${band.id}`} name={`child:${band.id}`} inputMode="decimal" defaultValue={asRupees(offering?.children[band.id])} placeholder="Not published" className="field" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
        <fieldset>
          <legend className="label">Sold on (none ticked means every day)</legend>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {weekdays.map((day, i) => (
              <label key={day} className="flex items-center gap-1.5 text-[0.88rem]">
                <input type="checkbox" name="soldOn" value={i} defaultChecked={offering?.soldOn?.includes(i)} className="size-4" /> {day}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor={`${key}-from`}>
            Sold from (optional)
          </label>
          <input id={`${key}-from`} name="validFrom" type="date" defaultValue={offering?.validFrom ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor={`${key}-to`}>
            Sold until (optional)
          </label>
          <input id={`${key}-to`} name="validTo" type="date" defaultValue={offering?.validTo ?? ""} className="field" />
        </div>
      </div>
      {!offering && (
        <fieldset className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-4">
          <legend className="px-1 text-[0.8rem] font-semibold text-muted">Its first time slot</legend>
          <div>
            <label className="label" htmlFor="new-slot-label">
              Slot
            </label>
            <input id="new-slot-label" name="slotLabel" defaultValue="All day" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="new-slot-from">
              Starts (optional)
            </label>
            <input id="new-slot-from" name="startsAt" type="time" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="new-slot-to">
              Ends (optional)
            </label>
            <input id="new-slot-to" name="endsAt" type="time" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="new-slot-seats">
              Seats a day
            </label>
            <input id="new-slot-seats" name="capacity" type="number" min={0} required className="field" />
          </div>
        </fieldset>
      )}
      <p className="text-[0.82rem] text-muted">Leave a child price empty when the resort hasn&apos;t published it; guests who need it see &ldquo;rate to confirm&rdquo;.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="button">
          {offering ? "Save changes" : "Add"}
        </button>
        <FormNote state={state} />
      </div>
    </form>
  );
}

export function OfferingButtons({ offeringId, active }: { offeringId: string; active: boolean }) {
  const [toggleState, toggle, toggling] = useActionState(setOfferingActive.bind(null, offeringId, !active), undefined);
  const [copyState, copy, copying] = useActionState(duplicateOffering.bind(null, offeringId), undefined);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action={copy}>
        <button type="submit" disabled={copying} className="button-quiet">
          Duplicate
        </button>
      </form>
      <form action={toggle}>
        <button type="submit" disabled={toggling} className="button-quiet">
          {active ? "Take off sale" : "Put on sale"}
        </button>
      </form>
      <div className="basis-full text-right">
        <FormNote state={copyState ?? toggleState} />
      </div>
    </div>
  );
}

/** Adds a slot to a package, or changes one. */
export function SlotForm({ offeringId, slot }: { offeringId: string; slot?: SlotValues }) {
  const [state, action, pending] = useActionState(slot ? updateSlot.bind(null, slot.id) : addSlot.bind(null, offeringId), undefined);
  const key = slot?.id ?? `${offeringId}-new`;
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto_auto] sm:items-end">
      <div>
        <label className="label" htmlFor={`${key}-label`}>
          Slot
        </label>
        <input id={`${key}-label`} name="label" required defaultValue={slot?.label} placeholder="Lunch, second sitting" className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${key}-from`}>
          Starts
        </label>
        <input id={`${key}-from`} name="startsAt" type="time" defaultValue={hhmm(slot?.startsAt ?? null)} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${key}-to`}>
          Ends
        </label>
        <input id={`${key}-to`} name="endsAt" type="time" defaultValue={hhmm(slot?.endsAt ?? null)} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${key}-seats`}>
          Usual seats a day
        </label>
        <input id={`${key}-seats`} name="capacity" type="number" min={0} required defaultValue={slot?.defaultCapacity} className="field" />
      </div>
      {slot ? (
        <label className="flex items-center gap-2 pb-2.5 text-[0.88rem]">
          <input type="checkbox" name="active" defaultChecked={slot.active} className="size-4" /> On sale
        </label>
      ) : (
        <input type="hidden" name="active" value="on" />
      )}
      <button type="submit" disabled={pending} className="button-quiet">
        {slot ? "Save" : "Add slot"}
      </button>
      <div className="sm:col-span-6">
        <FormNote state={state} />
      </div>
    </form>
  );
}

/** Seats for a slot on chosen days, such as more for a festival weekend (INV-09). */
export function SeatsForm({ slotId, first }: { slotId: string; first: string }) {
  const [state, action, pending] = useActionState(setSeats.bind(null, slotId), undefined);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_1fr_0.8fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor={`${slotId}-cap-from`}>
          First day
        </label>
        <input id={`${slotId}-cap-from`} name="from" type="date" required defaultValue={first} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${slotId}-cap-to`}>
          Last day
        </label>
        <input id={`${slotId}-cap-to`} name="to" type="date" required defaultValue={first} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${slotId}-cap-seats`}>
          Seats
        </label>
        <input id={`${slotId}-cap-seats`} name="seats" type="number" min={0} required className="field" />
      </div>
      <button type="submit" disabled={pending} className="button-quiet">
        Set seats
      </button>
      <div className="sm:col-span-4">
        <FormNote state={state} />
      </div>
    </form>
  );
}

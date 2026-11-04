"use client";

import { useActionState, useState } from "react";
import { FormNote } from "@/components/form-note";
import { mealLabel, nightsLabel } from "@/lib/format";
import { createSeason, deleteSeason, removeRate, saveBand, saveRate, saveWeekendNights } from "./actions";

export type RateValues = {
  roomTypeId: string;
  dayKind: "any" | "weekday" | "weekend";
  basis: "room" | "person";
  basePaise: number;
  extraAdultPaise: number | null;
  extraBedPaise: number | null;
  mealPlan: "EP" | "CP" | "MAP" | "AP";
  children: Record<string, number>;
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const asRupees = (paise: number | null | undefined) => (paise == null ? "" : String(paise / 100));

/** Which nights take the weekend rate (PR-02). The night of a Friday is the night from Friday to Saturday. */
export function WeekendForm({ propertyId, nights }: { propertyId: string; nights: number[] }) {
  const [state, action, pending] = useActionState(saveWeekendNights.bind(null, propertyId), undefined);
  return (
    <form action={action} className="mt-3 grid gap-3">
      <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
        <legend className="sr-only">Weekend nights</legend>
        {weekdays.map((day, i) => (
          <label key={day} className="flex items-center gap-1.5 text-[0.9rem]">
            <input type="checkbox" name="nights" value={i} defaultChecked={nights.includes(i)} className="size-4" /> {day}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="button-quiet">
          Save weekend nights
        </button>
        <FormNote state={state} />
      </div>
    </form>
  );
}

/**
 * Sets one rate: a room type's price for weekday, weekend or every night,
 * as its base rate or a season's. Choosing a room type and nights fills in
 * the rate already saved for them.
 */
export function RateForm({
  propertyId,
  roomTypes,
  seasonId,
  bands,
  existing,
}: {
  propertyId: string;
  roomTypes: { id: string; name: string }[];
  seasonId?: string;
  bands: { id: string; label: string }[];
  existing: RateValues[];
}) {
  const [state, action, pending] = useActionState(saveRate.bind(null, propertyId), undefined);
  const [roomTypeId, setRoomTypeId] = useState(roomTypes.length === 1 ? roomTypes[0].id : "");
  const [dayKind, setDayKind] = useState<RateValues["dayKind"]>("weekday");
  const current = existing.find((r) => r.roomTypeId === roomTypeId && r.dayKind === dayKind);
  const prefix = `${seasonId ?? "base"}-${roomTypes.length === 1 ? roomTypes[0].id : "any"}`;

  return (
    <form action={action} className="grid gap-3">
      {seasonId && <input type="hidden" name="seasonId" value={seasonId} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {roomTypes.length === 1 ? (
          <input type="hidden" name="roomTypeId" value={roomTypes[0].id} />
        ) : (
          <div>
            <label className="label" htmlFor={`${prefix}-type`}>
              Room type
            </label>
            <select id={`${prefix}-type`} name="roomTypeId" required value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)} className="field">
              <option value="" disabled>
                Choose
              </option>
              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor={`${prefix}-nights`}>
            Nights
          </label>
          <select id={`${prefix}-nights`} name="dayKind" value={dayKind} onChange={(e) => setDayKind(e.target.value as RateValues["dayKind"])} className="field">
            {Object.entries(nightsLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Remounted for each room type and nights, so the fields show what is saved for them. */}
      <div key={`${roomTypeId}-${dayKind}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label" htmlFor={`${prefix}-basis`}>
            Price is for
          </label>
          <select id={`${prefix}-basis`} name="basis" defaultValue={current?.basis ?? "room"} className="field">
            <option value="room">A room</option>
            <option value="person">Each adult</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}-base`}>
            Price a night (₹)
          </label>
          <input id={`${prefix}-base`} name="base" required inputMode="decimal" defaultValue={asRupees(current?.basePaise)} className="field" />
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}-meals`}>
            Meals
          </label>
          <select id={`${prefix}-meals`} name="mealPlan" defaultValue={current?.mealPlan ?? "CP"} className="field">
            {Object.entries(mealLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}-extra-adult`}>
            Each extra adult (₹)
          </label>
          <input id={`${prefix}-extra-adult`} name="extraAdult" inputMode="decimal" defaultValue={asRupees(current?.extraAdultPaise)} placeholder="Not published" className="field" />
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}-extra-bed`}>
            Each extra bed (₹)
          </label>
          <input id={`${prefix}-extra-bed`} name="extraBed" inputMode="decimal" defaultValue={asRupees(current?.extraBedPaise)} placeholder="Not published" className="field" />
        </div>
        {bands.map((band) => (
          <div key={band.id}>
            <label className="label" htmlFor={`${prefix}-child-${band.id}`}>
              Child, {band.label} (₹)
            </label>
            <input id={`${prefix}-child-${band.id}`} name={`child:${band.id}`} inputMode="decimal" defaultValue={asRupees(current?.children[band.id])} placeholder="Not published" className="field" />
          </div>
        ))}
      </div>
      <p className="text-[0.82rem] text-muted">Leave a price empty when the resort hasn&apos;t published it. Guests who need it see &ldquo;rate to confirm&rdquo;, never a guess.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="button">
          {current ? "Save changes" : "Add rate"}
        </button>
        <FormNote state={state} />
      </div>
    </form>
  );
}

/** A removal that asks once more before it happens. */
function ConfirmRemove({ action, pending, label, question }: { action: () => void; pending: boolean; label: string; question: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="text-[0.8rem] text-danger underline underline-offset-2">
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="inline-flex flex-wrap items-center justify-end gap-2 text-[0.8rem]">
      <span>{question}</span>
      <button type="submit" disabled={pending} className="font-semibold text-danger underline underline-offset-2">
        Yes, remove
      </button>
      <button type="button" onClick={() => setAsking(false)} className="underline underline-offset-2">
        Keep
      </button>
    </form>
  );
}

export function RemoveRateButton({ rateId }: { rateId: string }) {
  const [state, action, pending] = useActionState(removeRate.bind(null, rateId), undefined);
  return (
    <>
      <ConfirmRemove action={action} pending={pending} label="Remove" question="Remove this rate?" />
      <FormNote state={state} />
    </>
  );
}

export function SeasonForm({ propertyId }: { propertyId: string }) {
  const [state, action, pending] = useActionState(createSeason.bind(null, propertyId), undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr_0.7fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="season-name">
          Season
        </label>
        <input id="season-name" name="name" required placeholder="Diwali" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="season-from">
          First night
        </label>
        <input id="season-from" name="startsOn" type="date" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="season-to">
          Last night
        </label>
        <input id="season-to" name="endsOn" type="date" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="season-priority">
          Priority
        </label>
        <input id="season-priority" name="priority" type="number" min={0} max={100} defaultValue={0} className="field" />
      </div>
      <button type="submit" disabled={pending} className="button">
        Add season
      </button>
      <div className="sm:col-span-5">
        <FormNote state={state} />
      </div>
    </form>
  );
}

export function DeleteSeasonButton({ seasonId }: { seasonId: string }) {
  const [state, action, pending] = useActionState(deleteSeason.bind(null, seasonId), undefined);
  return (
    <div>
      <ConfirmRemove action={action} pending={pending} label="Remove season and its rates" question="Remove the season and all its rates?" />
      <FormNote state={state} />
    </div>
  );
}

type Band = { id: string; code: string; label: string; minAge: number; maxAge: number; free: boolean };

/** Adds a child age band, or changes one (its code stays). */
export function BandForm({ propertyId, band }: { propertyId: string; band?: Band }) {
  const [state, action, pending] = useActionState(saveBand.bind(null, propertyId, band?.id ?? null), undefined);
  const key = band?.id ?? "new";
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1.2fr_1fr_0.6fr_0.6fr_auto_auto] sm:items-end">
      <div>
        <label className="label" htmlFor={`${key}-label`}>
          Band
        </label>
        <input id={`${key}-label`} name="label" required defaultValue={band?.label} placeholder="5 to 11" className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${key}-code`}>
          Code
        </label>
        <input id={`${key}-code`} name="code" required readOnly={Boolean(band)} defaultValue={band?.code} placeholder="child_5_11" className={`field ${band ? "text-muted" : ""}`} />
      </div>
      <div>
        <label className="label" htmlFor={`${key}-min`}>
          From age
        </label>
        <input id={`${key}-min`} name="minAge" type="number" min={0} max={17} required defaultValue={band?.minAge} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${key}-max`}>
          To age
        </label>
        <input id={`${key}-max`} name="maxAge" type="number" min={0} max={17} required defaultValue={band?.maxAge} className="field" />
      </div>
      <label className="flex items-center gap-2 pb-2.5 text-[0.9rem]">
        <input type="checkbox" name="free" defaultChecked={band?.free} className="size-4" /> Free
      </label>
      <button type="submit" disabled={pending} className="button-quiet">
        {band ? "Save" : "Add band"}
      </button>
      <div className="sm:col-span-6">
        <FormNote state={state} />
      </div>
    </form>
  );
}

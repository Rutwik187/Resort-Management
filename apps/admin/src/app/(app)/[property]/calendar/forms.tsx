"use client";

import { useActionState } from "react";
import { FormNote } from "@/components/form-note";
import { blockDates, liftBlockAction, setDatePrices, setStayRules } from "./actions";

type RoomType = { id: string; name: string; units: { id: string; name: string }[] };

const reasons = [
  ["maintenance", "Maintenance"],
  ["owner_use", "Owner use"],
  ["ota_allocation", "Given to an OTA"],
  ["wedding_buyout", "Wedding or buyout"],
  ["other", "Other"],
] as const;

function Dates({ prefix, first, last, labels = ["First night", "Last night"] }: { prefix: string; first: string; last: string; labels?: [string, string] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="label" htmlFor={`${prefix}-from`}>
          {labels[0]}
        </label>
        <input id={`${prefix}-from`} name={prefix === "block" ? "startsOn" : "from"} type="date" required defaultValue={first} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-to`}>
          {labels[1]}
        </label>
        <input id={`${prefix}-to`} name={prefix === "block" ? "endsOn" : "to"} type="date" required defaultValue={last} className="field" />
      </div>
    </div>
  );
}

/** Blocks a unit, a room type or the whole resort (INV-04, INV-05). */
export function BlockForm({ propertyId, types, first, last }: { propertyId: string; types: RoomType[]; first: string; last: string }) {
  const [state, action, pending] = useActionState(blockDates.bind(null, propertyId), undefined);
  return (
    <details className="card p-5">
      <summary className="cursor-pointer font-semibold">Block rooms or the whole resort</summary>
      <form action={action} className="mt-4 grid gap-3">
        <div>
          <label className="label" htmlFor="block-scope">
            What to block
          </label>
          <select id="block-scope" name="scope" required defaultValue="" className="field">
            <option value="" disabled>
              Choose
            </option>
            <option value="resort">The whole resort (a wedding or a buyout)</option>
            {types.map((type) => (
              <optgroup key={type.id} label={type.name}>
                <option value={`type:${type.id}`}>Every {type.name}</option>
                {type.units.map((unit) => (
                  <option key={unit.id} value={`unit:${unit.id}`}>
                    {unit.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <Dates prefix="block" first={first} last={last} />
        <div>
          <label className="label" htmlFor="block-reason">
            Why
          </label>
          <select id="block-reason" name="reason" required defaultValue="maintenance" className="field">
            {reasons.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <input name="note" aria-label="Note" placeholder="Note, such as the OTA or the event" className="field" />
        <button type="submit" disabled={pending} className="button justify-self-start">
          Block
        </button>
        <p className="text-[0.82rem] text-muted-foreground">A night that is already held or booked can&apos;t be blocked; nothing is blocked then, and the note says how many clash.</p>
        <FormNote state={state} />
      </form>
    </details>
  );
}

/** Stay rules for a run of nights (INV-08). Nothing ticked or filled clears them. */
export function RulesForm({ propertyId, types, first, last }: { propertyId: string; types: RoomType[]; first: string; last: string }) {
  const [state, action, pending] = useActionState(setStayRules.bind(null, propertyId), undefined);
  return (
    <details className="card p-5">
      <summary className="cursor-pointer font-semibold">Stay rules</summary>
      <form action={action} className="mt-4 grid gap-3">
        <div>
          <label className="label" htmlFor="rules-type">
            Room type
          </label>
          <select id="rules-type" name="roomType" required defaultValue="all" className="field">
            <option value="all">Every room type</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <Dates prefix="rules" first={first} last={last} />
        <label className="flex items-center gap-2 text-[0.9rem]">
          <input type="checkbox" name="stopSell" className="size-4" /> Stop selling these nights
        </label>
        <label className="flex items-center gap-2 text-[0.9rem]">
          <input type="checkbox" name="closedToArrival" className="size-4" /> No arrivals on these nights
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="rules-min">
              Fewest nights
            </label>
            <input id="rules-min" name="minNights" type="number" min={1} max={60} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="rules-max">
              Most nights
            </label>
            <input id="rules-max" name="maxNights" type="number" min={1} max={365} className="field" />
          </div>
        </div>
        <button type="submit" disabled={pending} className="button justify-self-start">
          Save rules
        </button>
        <p className="text-[0.82rem] text-muted-foreground">The fewest and most nights apply to stays that start on a night. Save with nothing ticked or filled to clear the rules.</p>
        <FormNote state={state} />
      </form>
    </details>
  );
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A room type's price for chosen nights (PR-04). An empty price clears it. */
export function PricesForm({ propertyId, types, first, last }: { propertyId: string; types: RoomType[]; first: string; last: string }) {
  const [state, action, pending] = useActionState(setDatePrices.bind(null, propertyId), undefined);
  return (
    <details className="card p-5">
      <summary className="cursor-pointer font-semibold">Prices for dates</summary>
      <form action={action} className="mt-4 grid gap-3">
        <div>
          <label className="label" htmlFor="prices-type">
            Room type
          </label>
          <select id="prices-type" name="roomType" required defaultValue="" className="field">
            <option value="" disabled>
              Choose
            </option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <Dates prefix="prices" first={first} last={last} />
        <fieldset>
          <legend className="label">Only on (leave all clear for every night)</legend>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {weekdays.map((day, i) => (
              <label key={day} className="flex items-center gap-1.5 text-[0.88rem]">
                <input type="checkbox" name="weekdays" value={i} className="size-4" /> {day}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="prices-price">
            Base price a night (₹)
          </label>
          <input id="prices-price" name="price" inputMode="decimal" className="field" placeholder="Leave empty to remove date prices" />
        </div>
        <button type="submit" disabled={pending} className="button justify-self-start">
          Save prices
        </button>
        <p className="text-[0.82rem] text-muted-foreground">A date price takes the place of the base or season price for those nights. Extra guests and children still pay the room type&apos;s rates, so it needs a base rate on the Prices tab.</p>
        <FormNote state={state} />
      </form>
    </details>
  );
}

export function LiftBlockButton({ blockId }: { blockId: string }) {
  const [state, action, pending] = useActionState(liftBlockAction.bind(null, blockId), undefined);
  return (
    <form action={action} className="grid gap-1.5">
      <button type="submit" disabled={pending} className="button-quiet justify-self-start">
        Lift the block
      </button>
      <FormNote state={state} />
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { addUnits, createRoomType, editRoomType, type FormState } from "./actions";

function Note({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-[0.88rem] ${state.error ? "text-danger" : "text-good"}`}>
      {state.error ?? state.done}
    </p>
  );
}

/** Adds a room type: what it is, and how many guests it takes (RM-01). */
export function RoomTypeForm({ propertyId }: { propertyId: string }) {
  const [state, action, pending] = useActionState(createRoomType.bind(null, propertyId), undefined);
  return (
    <details className="card mt-6 p-5">
      <summary className="cursor-pointer font-semibold">Add a room type</summary>
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" required className="field" placeholder="Garden View Cottage" />
        </div>
        <div>
          <label className="label" htmlFor="code">
            Code
          </label>
          <input id="code" name="code" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className="field" placeholder="garden-view-cottage" />
        </div>
        <div>
          <label className="label" htmlFor="category">
            Kind
          </label>
          <select id="category" name="category" className="field" defaultValue="room">
            <option value="room">Room</option>
            <option value="cottage">Cottage</option>
            <option value="villa">Villa</option>
            <option value="tent">Tent</option>
            <option value="dormitory">Dormitory</option>
            <option value="other">Other</option>
          </select>
        </div>
        {(
          [
            ["baseOccupancy", "Guests in the base price", 2],
            ["minGuests", "Fewest guests", 1],
            ["maxAdults", "Most adults", 3],
            ["maxChildren", "Most children", 2],
            ["maxGuests", "Most guests", 4],
          ] as const
        ).map(([name, label, value]) => (
          <div key={name}>
            <label className="label" htmlFor={name}>
              {label}
            </label>
            <input id={name} name={name} type="number" min={0} defaultValue={value} required className="field" />
          </div>
        ))}
        <div>
          <label className="label" htmlFor="bedType">
            Bed
          </label>
          <input id="bedType" name="bedType" className="field" placeholder="King bed" />
        </div>
        <div>
          <label className="label" htmlFor="sizeSqft">
            Size (sq ft)
          </label>
          <input id="sizeSqft" name="sizeSqft" type="number" min={1} className="field" />
        </div>
        <label className="flex items-center gap-2 self-end pb-2">
          <input type="checkbox" name="extraBedAllowed" className="size-4" /> Extra bed allowed
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" disabled={pending} className="button">
            Add room type
          </button>
          <Note state={state} />
        </div>
      </form>
    </details>
  );
}

/** Adds units: one by name, or a numbered run such as Cottage 1 to 12 (RM-02). */
export function AddUnitsForm({ roomTypeId, suggestion }: { roomTypeId: string; suggestion: string }) {
  const [state, action, pending] = useActionState(addUnits.bind(null, roomTypeId), undefined);
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
      <div>
        <label className="label" htmlFor={`${roomTypeId}-prefix`}>
          Unit name
        </label>
        <input id={`${roomTypeId}-prefix`} name="prefix" required defaultValue={suggestion} className="field w-40" />
      </div>
      <div>
        <label className="label" htmlFor={`${roomTypeId}-from`}>
          Numbered from
        </label>
        <input id={`${roomTypeId}-from`} name="from" type="number" min={0} className="field w-24" placeholder="1" />
      </div>
      <div>
        <label className="label" htmlFor={`${roomTypeId}-to`}>
          to
        </label>
        <input id={`${roomTypeId}-to`} name="to" type="number" min={0} className="field w-24" placeholder="12" />
      </div>
      <div>
        <label className="label" htmlFor={`${roomTypeId}-block`}>
          Block or floor
        </label>
        <input id={`${roomTypeId}-block`} name="block" className="field w-36" />
      </div>
      <button type="submit" disabled={pending} className="button-quiet">
        Add units
      </button>
      <Note state={state} />
    </form>
  );
}

type RoomTypeValues = {
  id: string;
  name: string;
  category: string;
  baseOccupancy: number;
  minGuests: number;
  maxAdults: number;
  maxChildren: number;
  maxGuests: number;
  extraBedAllowed: boolean;
  bedType: string | null;
  sizeSqft: number | null;
};

/** Changes a room type (RM-01). Its code stays, because it links the type's photos and text. */
export function RoomTypeEditForm({ type }: { type: RoomTypeValues }) {
  const [state, action, pending] = useActionState(editRoomType.bind(null, type.id), undefined);
  const id = (name: string) => `${type.id}-${name}`;
  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <label className="label" htmlFor={id("name")}>
          Name
        </label>
        <input id={id("name")} name="name" required defaultValue={type.name} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={id("category")}>
          Kind
        </label>
        <select id={id("category")} name="category" defaultValue={type.category} className="field">
          <option value="room">Room</option>
          <option value="cottage">Cottage</option>
          <option value="villa">Villa</option>
          <option value="tent">Tent</option>
          <option value="dormitory">Dormitory</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor={id("bedType")}>
          Bed
        </label>
        <input id={id("bedType")} name="bedType" defaultValue={type.bedType ?? ""} className="field" />
      </div>
      {(
        [
          ["baseOccupancy", "Guests in the base price", type.baseOccupancy],
          ["minGuests", "Fewest guests", type.minGuests],
          ["maxAdults", "Most adults", type.maxAdults],
          ["maxChildren", "Most children", type.maxChildren],
          ["maxGuests", "Most guests", type.maxGuests],
          ["sizeSqft", "Size (sq ft)", type.sizeSqft ?? ""],
        ] as const
      ).map(([name, label, value]) => (
        <div key={name}>
          <label className="label" htmlFor={id(name)}>
            {label}
          </label>
          <input id={id(name)} name={name} type="number" min={name === "sizeSqft" ? 1 : 0} required={name !== "sizeSqft"} defaultValue={value} className="field" />
        </div>
      ))}
      <label className="flex items-center gap-2 self-end pb-2">
        <input type="checkbox" name="extraBedAllowed" defaultChecked={type.extraBedAllowed} className="size-4" /> Extra bed allowed
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
        <button type="submit" disabled={pending} className="button-quiet">
          Save changes
        </button>
        <Note state={state} />
      </div>
    </form>
  );
}

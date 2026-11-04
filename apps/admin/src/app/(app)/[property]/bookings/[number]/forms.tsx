"use client";

import { useActionState } from "react";
import { FormNote } from "@/components/form-note";
import { methodLabel } from "@/lib/format";
import { cancelBooking, changePrice, changeRoom, moveBooking, noteBooking, takePayment } from "./actions";

/** One front-desk move: check in, check out or no-show. */
export function MoveButton({ bookingId, to, label, quiet = false }: { bookingId: string; to: "checked_in" | "checked_out" | "no_show"; label: string; quiet?: boolean }) {
  const [state, action, pending] = useActionState(moveBooking.bind(null, bookingId, to), undefined);
  return (
    <form action={action} className="grid gap-1.5">
      <button type="submit" disabled={pending} className={quiet ? "button-quiet justify-center" : "button"}>
        {label}
      </button>
      <FormNote state={state} />
    </form>
  );
}

export function CancelForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(cancelBooking.bind(null, bookingId), undefined);
  return (
    <details className="rounded-lg border border-line p-3">
      <summary className="cursor-pointer text-[0.9rem] font-semibold text-danger">Cancel the booking</summary>
      <form action={action} className="mt-3 grid gap-2">
        <label className="label" htmlFor="cancel-reason">
          Why is it cancelled?
        </label>
        <input id="cancel-reason" name="reason" required minLength={3} className="field" placeholder="Guest changed plans" />
        <button type="submit" disabled={pending} className="button bg-danger">
          Cancel and free the rooms
        </button>
        <FormNote state={state} />
      </form>
    </details>
  );
}

export function PaymentForm({ bookingId, suggested }: { bookingId: string; suggested: string }) {
  const [state, action, pending] = useActionState(takePayment.bind(null, bookingId), undefined);
  return (
    <form action={action} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="pay-method">
          Paid by
        </label>
        <select id="pay-method" name="method" required defaultValue="" className="field">
          <option value="" disabled>
            Choose
          </option>
          {Object.entries(methodLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="pay-amount">
          Amount (₹)
        </label>
        <input id="pay-amount" name="amount" required inputMode="decimal" defaultValue={suggested} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="pay-reference">
          Reference (UPI, card or receipt number)
        </label>
        <input id="pay-reference" name="reference" className="field" />
      </div>
      <button type="submit" disabled={pending} className="button">
        Record payment
      </button>
      <div className="sm:col-span-4">
        <FormNote state={state} />
      </div>
    </form>
  );
}

export function PriceForm({ bookingId, current }: { bookingId: string; current: string }) {
  const [state, action, pending] = useActionState(changePrice.bind(null, bookingId), undefined);
  return (
    <details className="rounded-lg border border-line p-3">
      <summary className="cursor-pointer text-[0.9rem] font-semibold">Set the price</summary>
      <form action={action} className="mt-3 grid gap-2">
        <label className="label" htmlFor="price-amount">
          Price for the whole booking (₹)
        </label>
        <input id="price-amount" name="amount" required inputMode="decimal" defaultValue={current} className="field" />
        <label className="label" htmlFor="price-reason">
          Why
        </label>
        <input id="price-reason" name="reason" required minLength={3} className="field" placeholder="Rate agreed with the guest" />
        <button type="submit" disabled={pending} className="button-quiet justify-center">
          Save the price
        </button>
        <FormNote state={state} />
      </form>
    </details>
  );
}

export function RoomForm({ bookingItemId, rooms }: { bookingItemId: string; rooms: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(changeRoom.bind(null, bookingItemId), undefined);
  if (rooms.length === 0) return <p className="mt-1 text-[0.8rem] text-muted">No other room of this type is free for these nights.</p>;
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`room-${bookingItemId}`}>
        Move to
      </label>
      <select id={`room-${bookingItemId}`} name="unitId" required defaultValue="" className="field min-h-9 w-auto py-1 text-[0.85rem]">
        <option value="" disabled>
          Move to another room
        </option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="button-quiet min-h-9 text-[0.85rem]">
        Move
      </button>
      <FormNote state={state} />
    </form>
  );
}

export function NoteForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(noteBooking.bind(null, bookingId), undefined);
  return (
    <form action={action} className="grid gap-2">
      <label className="label" htmlFor="note">
        Internal note
      </label>
      <textarea id="note" name="note" required rows={3} className="field" placeholder="Only staff see this." />
      <button type="submit" disabled={pending} className="button-quiet justify-center">
        Add note
      </button>
      <FormNote state={state} />
    </form>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="button-quiet print:hidden">
      Print
    </button>
  );
}

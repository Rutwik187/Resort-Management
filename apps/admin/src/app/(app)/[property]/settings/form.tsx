"use client";

import { useActionState } from "react";
import { FormNote } from "@/components/form-note";
import { saveSettings } from "./actions";

type Settings = {
  legalName: string | null;
  gstin: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  checkInTime: string;
  checkOutTime: string;
  holdMinutes: number;
  lowStockThreshold: number;
};

export function SettingsForm({ propertyId, settings }: { propertyId: string; settings: Settings }) {
  const [state, action, pending] = useActionState(saveSettings.bind(null, propertyId), undefined);
  return (
    <form action={action} className="mt-6 grid gap-5 lg:grid-cols-2">
      <fieldset className="card grid content-start gap-3 p-5">
        <legend className="sr-only">Company</legend>
        <h2 className="font-semibold">Company</h2>
        <p className="-mt-2 text-[0.85rem] text-muted-foreground">Each resort is its own company. These go on its invoices.</p>
        <div>
          <label className="label" htmlFor="legalName">
            Legal name
          </label>
          <input id="legalName" name="legalName" defaultValue={settings.legalName ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="gstin">
            GSTIN
          </label>
          <input id="gstin" name="gstin" defaultValue={settings.gstin ?? ""} className="field uppercase" />
        </div>
        <div>
          <label className="label" htmlFor="address">
            Address
          </label>
          <textarea id="address" name="address" rows={3} defaultValue={settings.address ?? ""} className="field" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" defaultValue={settings.email ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" type="tel" defaultValue={settings.phone ?? ""} className="field" />
          </div>
        </div>
      </fieldset>
      <fieldset className="card grid content-start gap-3 p-5">
        <legend className="sr-only">Stays and bookings</legend>
        <h2 className="font-semibold">Stays and bookings</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="checkInTime">
              Check-in from
            </label>
            <input id="checkInTime" name="checkInTime" type="time" required defaultValue={settings.checkInTime.slice(0, 5)} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="checkOutTime">
              Check-out by
            </label>
            <input id="checkOutTime" name="checkOutTime" type="time" required defaultValue={settings.checkOutTime.slice(0, 5)} className="field" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="holdMinutes">
            Hold time, in minutes
          </label>
          <input id="holdMinutes" name="holdMinutes" type="number" min={1} max={120} required defaultValue={settings.holdMinutes} className="field" />
          <p className="mt-1 text-[0.82rem] text-muted-foreground">How long a guest&apos;s rooms or seats stay held while they pay (INV-03). After that, they go back on sale.</p>
        </div>
        <div>
          <label className="label" htmlFor="lowStockThreshold">
            Rooms left before an alert
          </label>
          <input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} max={50} required defaultValue={settings.lowStockThreshold} className="field" />
          <p className="mt-1 text-[0.82rem] text-muted-foreground">The Today page lists a room type when this many rooms or fewer are left for a night (INV-10).</p>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <button type="submit" disabled={pending} className="button">
          Save settings
        </button>
        <FormNote state={state} />
      </div>
    </form>
  );
}

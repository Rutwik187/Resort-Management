"use client";

import { useActionState, useState } from "react";
import { inviteStaff } from "./actions";

/** Adds a person: their Google email, one role, and their resorts. */
export function InviteForm({ roles, resorts }: { roles: { id: string; name: string; description: string | null }[]; resorts: { id: string; name: string; code: string }[] }) {
  const [state, action, pending] = useActionState(inviteStaff, undefined);
  const [all, setAll] = useState(false);
  return (
    <details className="card mt-6 p-5">
      <summary className="cursor-pointer font-semibold">Add a person</summary>
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Google email
          </label>
          <input id="email" name="email" type="email" required className="field" />
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="label">Role</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((role) => (
              <label key={role.id} className="flex gap-2.5 rounded-lg border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                {/* No role is chosen for the person: the Super Admin picks one. */}
                <input type="radio" name="roleId" value={role.id} required className="mt-1" />
                <span>
                  <span className="block font-medium">{role.name}</span>
                  <span className="text-[0.85rem] text-muted-foreground">{role.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="sm:col-span-2">
          <legend className="label">Resorts</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="allProperties" checked={all} onChange={(e) => setAll(e.target.checked)} /> All resorts, now and later
          </label>
          {!all && (
            <div className="mt-2 flex flex-wrap gap-3">
              {resorts.map((resort) => (
                <label key={resort.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <input type="checkbox" name="propertyIds" value={resort.id} /> {resort.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className="button">
            Add person
          </button>
          {state && <p role="status" className={`text-[0.88rem] ${state.error ? "text-danger" : "text-good"}`}>{state.error ?? state.done}</p>}
        </div>
      </form>
    </details>
  );
}

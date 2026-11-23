"use client";

import { useId } from "react";

/*
 * Consent on every form (WEB-08, DPP-01): agreeing to the privacy policy is
 * needed to send; hearing about offers is separate and optional. The text
 * is versioned, and the version goes with the form.
 */

export const formConsentVersion = "2026-11";
export type FormConsentValue = { version: string; marketing: boolean; at: string };

/** The two checkboxes, in the site's own type. Put it just above the send button. */
export function FormConsent({ policyHref, className = "", boxClassName = "" }: { policyHref: string; className?: string; boxClassName?: string }) {
  const id = useId();
  return (
    <div className={`grid gap-3 text-[0.9rem] ${className}`} data-form-consent>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="consent"
          value="yes"
          aria-describedby={`${id}-error`}
          onChange={(event) => {
            const error = event.currentTarget.form?.querySelector<HTMLElement>("[data-consent-error]");
            if (error && event.currentTarget.checked) error.hidden = true;
          }}
          className={`mt-1 size-4 shrink-0 ${boxClassName}`}
        />
        <span>
          I agree that the resort keeps these details to reply to me, as the{" "}
          <a href={policyHref} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            privacy policy
          </a>{" "}
          says.
        </span>
      </label>
      <label className="flex items-start gap-3 opacity-85">
        <input type="checkbox" name="marketing" value="yes" className={`mt-1 size-4 shrink-0 ${boxClassName}`} />
        <span>Send me offers now and then. (optional)</span>
      </label>
      <p id={`${id}-error`} data-consent-error hidden role="alert" className="font-medium text-[#b42318]">
        Please agree to the privacy policy so we can reply.
      </p>
    </div>
  );
}

/** Checks the form's consent box. When it isn't ticked, shows the message and moves the focus there. */
export function formConsent(form: HTMLFormElement): FormConsentValue | null {
  const box = form.querySelector<HTMLInputElement>('input[name="consent"]');
  if (box && !box.checked) {
    const error = form.querySelector<HTMLElement>("[data-consent-error]");
    if (error) error.hidden = false;
    box.focus();
    return null;
  }
  const marketing = form.querySelector<HTMLInputElement>('input[name="marketing"]')?.checked ?? false;
  return { version: formConsentVersion, marketing, at: new Date().toISOString() };
}

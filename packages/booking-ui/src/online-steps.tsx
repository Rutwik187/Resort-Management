"use client";

import { useEffect, useId, useState, type FormEvent, type RefObject } from "react";
import { FieldError, contactErrors } from "./form-fields";
import { formatRupees } from "./pricing";
import { payWithRazorpay, type OnlineBooking, type OnlineChoice, type OnlineGuest, type OnlineStarted } from "./online";

const field =
  "mt-1.5 w-full rounded-bk-control border border-bk-line bg-transparent px-4 py-3 text-[1rem] text-bk-ink outline-none transition-colors placeholder:text-bk-muted/60 focus:border-bk-ink";
const primary = "min-h-12 w-full rounded-bk-control bg-bk-accent px-5 bk-button text-bk-accent-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50";
const secondary = "min-h-12 w-full rounded-bk-control border border-bk-line px-5 bk-button hover:border-bk-ink";

const rupees = (paise: number) => formatRupees(paise / 100);

export const emptyOnlineGuest: OnlineGuest = { name: "", phone: "", email: "", companyName: "", companyGstin: "", note: "", marketing: false, acceptedTerms: false };

type DetailsProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  guest: OnlineGuest;
  setGuest: (guest: OnlineGuest) => void;
  online: OnlineBooking;
  choice: () => OnlineChoice | null;
  onBack: () => void;
  onStarted: (started: OnlineStarted) => void;
  /** Sends the request on WhatsApp instead, when it can't be booked online. */
  onWhatsApp: () => void;
};

/** The guest's details and consent, then the rooms or seats are held and priced. */
export function OnlineDetails({ headingRef, guest, setGuest, online, choice, onBack, onStarted, onWhatsApp }: DetailsProps) {
  const id = useId();
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string; terms?: string; gstin?: string }>({});
  const [company, setCompany] = useState(Boolean(guest.companyGstin));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ error: string; whatsapp?: boolean } | null>(null);
  const set = (patch: Partial<OnlineGuest>) => setGuest({ ...guest, ...patch });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contact = contactErrors(guest.name, guest.phone);
    const found = {
      ...contact,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim()) ? undefined : "Add your email. The confirmation and invoice go there.",
      gstin: company && guest.companyGstin && !/^\d{2}[A-Za-z]{5}\d{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]$/.test(guest.companyGstin.trim()) ? "A GSTIN has 15 letters and digits." : undefined,
      terms: guest.acceptedTerms ? undefined : "Please accept the booking terms.",
    };
    setErrors(found);
    const first = (["name", "phone", "email", "gstin", "terms"] as const).find((key) => found[key]);
    if (first) {
      (event.currentTarget.elements.namedItem(first) as HTMLInputElement | null)?.focus();
      return;
    }
    const picked = choice();
    if (!picked) return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await online.start(picked, company ? guest : { ...guest, companyName: "", companyGstin: "" });
      if (result.ok) onStarted(result.started);
      else setFailure(result);
    } catch {
      setFailure({ error: "We couldn't reach the booking system. Try again, or send the request on WhatsApp.", whatsapp: true });
    } finally {
      setBusy(false);
    }
  }

  const input = (name: "name" | "phone" | "email", label: string, extra: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="block text-[0.9rem] text-bk-muted">
        {label}
        <input
          name={name}
          value={guest[name]}
          aria-invalid={Boolean(errors[name]) || undefined}
          aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}
          onChange={(event) => {
            set({ [name]: event.target.value });
            if (errors[name]) setErrors({ ...errors, [name]: undefined });
          }}
          className={`${field} ${errors[name] ? "border-bk-alert" : ""}`}
          {...extra}
        />
      </label>
      <FieldError id={`${id}-${name}-error`} message={errors[name]} />
    </div>
  );

  return (
    <section aria-labelledby={`${id}-title`} className="text-bk-ink">
      <button type="button" onClick={onBack} className="-ml-1 flex min-h-11 items-center gap-2 px-1 text-[0.9rem] text-bk-muted hover:text-bk-ink">
        <span aria-hidden>←</span> Back to your choice
      </button>
      <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="bk-display mt-2 text-[1.7rem] outline-none">
        Your details
      </h2>
      <p className="mt-2 text-[0.9rem] text-bk-muted">Next, we hold your booking and show the price with GST before you pay.</p>
      <form onSubmit={submit} noValidate className="mt-5 grid gap-4">
        {input("name", "Your name", { autoComplete: "name" })}
        {input("phone", "Mobile number", { type: "tel", inputMode: "tel", autoComplete: "tel" })}
        {input("email", "Email", { type: "email", inputMode: "email", autoComplete: "email" })}
        <label className="flex items-start gap-3 text-[0.9rem] text-bk-muted">
          <input type="checkbox" checked={company} onChange={(event) => setCompany(event.target.checked)} className="mt-1 size-4 accent-[var(--bk-accent)]" />
          Booking for a company? Add its GSTIN for a GST invoice.
        </label>
        {company && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block text-[0.9rem] text-bk-muted">
              Company name
              <input name="companyName" value={guest.companyName} onChange={(event) => set({ companyName: event.target.value })} className={field} autoComplete="organization" />
            </label>
            <div>
              <label className="block text-[0.9rem] text-bk-muted">
                GSTIN
                <input
                  name="gstin"
                  value={guest.companyGstin}
                  onChange={(event) => {
                    set({ companyGstin: event.target.value.toUpperCase() });
                    if (errors.gstin) setErrors({ ...errors, gstin: undefined });
                  }}
                  maxLength={15}
                  className={`${field} uppercase ${errors.gstin ? "border-bk-alert" : ""}`}
                />
              </label>
              <FieldError id={`${id}-gstin-error`} message={errors.gstin} />
            </div>
          </div>
        )}
        <label className="block text-[0.9rem] text-bk-muted">
          Anything we should know <span className="text-bk-muted/70">(optional)</span>
          <textarea rows={2} value={guest.note} onChange={(event) => set({ note: event.target.value })} className={`${field} resize-none rounded-[calc(var(--bk-radius)*0.6)]`} />
        </label>
        <div>
          <label className="flex items-start gap-3 text-[0.9rem]">
            <input
              name="terms"
              type="checkbox"
              checked={guest.acceptedTerms}
              onChange={(event) => {
                set({ acceptedTerms: event.target.checked });
                if (errors.terms) setErrors({ ...errors, terms: undefined });
              }}
              aria-invalid={Boolean(errors.terms) || undefined}
              className="mt-1 size-4 accent-[var(--bk-accent)]"
            />
            <span>
              I accept the{" "}
              <a href={online.termsHref} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                booking terms and cancellation policy
              </a>
              .
            </span>
          </label>
          <FieldError id={`${id}-terms-error`} message={errors.terms} />
        </div>
        <label className="flex items-start gap-3 text-[0.9rem] text-bk-muted">
          <input type="checkbox" checked={guest.marketing} onChange={(event) => set({ marketing: event.target.checked })} className="mt-1 size-4 accent-[var(--bk-accent)]" />
          Send me offers from the resort now and then. <span className="text-bk-muted/70">(optional)</span>
        </label>
        {failure && (
          <div role="alert" className="rounded-[calc(var(--bk-radius)*0.6)] border border-bk-alert/40 bg-bk-alert/5 p-3 text-[0.9rem] text-bk-alert">
            {failure.error}
          </div>
        )}
        <button type="submit" disabled={busy} className={`mt-1 ${primary}`}>
          {busy ? "Holding your booking…" : "Continue to price and payment"}
        </button>
        {failure?.whatsapp && (
          <button type="button" onClick={onWhatsApp} className={secondary}>
            Send the request on WhatsApp instead
          </button>
        )}
      </form>
    </section>
  );
}

function useCountdown(until: string) {
  const [left, setLeft] = useState(() => Date.parse(until) - Date.now());
  useEffect(() => {
    const timer = setInterval(() => setLeft(Date.parse(until) - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return Math.max(0, left);
}

type ReviewProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  started: OnlineStarted;
  guest: OnlineGuest;
  online: OnlineBooking;
  onBack: () => void;
};

/** The held booking's price with GST, the time left, and the payment (booking steps 5 and 6). */
export function OnlineReview({ headingRef, started, guest, online, onBack }: ReviewProps) {
  const id = useId();
  const left = useCountdown(started.holdExpiresAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const later = started.totalPaise - started.dueNowPaise;

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const answer = await payWithRazorpay(started.checkout, { name: guest.name, phone: guest.phone, email: guest.email });
      if ("closed" in answer) {
        setError(answer.error ? `${answer.error} You can try again.` : null);
        return;
      }
      const result = await online.confirm(answer);
      if (result.ok) window.location.assign(started.url);
      else setError(`${result.error} If money left your account, your booking page will update shortly.`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The payment window didn't open. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="text-bk-ink">
      <button type="button" onClick={onBack} className="-ml-1 flex min-h-11 items-center gap-2 px-1 text-[0.9rem] text-bk-muted hover:text-bk-ink">
        <span aria-hidden>←</span> Change your details
      </button>
      <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="bk-display mt-2 text-[1.7rem] outline-none">
        Review and pay
      </h2>
      <p className="mt-2 text-[0.9rem] text-bk-muted">
        Booking {started.number}.{" "}
        {left > 0 ? (
          <>
            Held for you for{" "}
            <strong className="tabular-nums text-bk-ink" aria-live="off">
              {minutes}:{String(seconds).padStart(2, "0")}
            </strong>
            .
          </>
        ) : (
          <strong className="text-bk-alert">The hold has run out.</strong>
        )}
      </p>
      {started.checkout.mode === "test" && (
        <p className="mt-3 rounded-[calc(var(--bk-radius)*0.6)] bg-bk-soft px-3 py-2 text-[0.82rem] text-bk-muted">Test mode: no money moves. Pay with Razorpay&apos;s test card or test netbanking.</p>
      )}
      <dl className="mt-5 grid gap-2 text-[0.92rem]">
        {started.lines.map((line, i) => (
          <div key={i} className="flex justify-between gap-4">
            <dt className="text-bk-muted">{line.title}</dt>
            <dd className="tabular-nums">{line.amountPaise === null ? "" : rupees(line.amountPaise)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-bk-line pt-2">
          <dt className="text-bk-muted">Price before GST</dt>
          <dd className="tabular-nums">{rupees(started.subtotalPaise)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-bk-muted">GST</dt>
          <dd className="tabular-nums">{rupees(started.taxPaise)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-bk-line pt-3">
          <dt>Total</dt>
          <dd className="bk-display text-[1.6rem] leading-none tabular-nums">{rupees(started.totalPaise)}</dd>
        </div>
        {later > 0 && (
          <div className="flex justify-between gap-4 text-bk-muted">
            <dt>Pay now, to book</dt>
            <dd className="tabular-nums text-bk-ink">{rupees(started.dueNowPaise)}</dd>
          </div>
        )}
        {later > 0 && (
          <div className="flex justify-between gap-4 text-bk-muted">
            <dt>Pay later, by link or at the resort</dt>
            <dd className="tabular-nums">{rupees(later)}</dd>
          </div>
        )}
      </dl>
      {error && (
        <div role="alert" className="mt-4 rounded-[calc(var(--bk-radius)*0.6)] border border-bk-alert/40 bg-bk-alert/5 p-3 text-[0.9rem] text-bk-alert">
          {error}
        </div>
      )}
      <div className="mt-5 grid gap-2">
        {left > 0 ? (
          <button type="button" onClick={pay} disabled={busy} className={primary}>
            {busy ? "Waiting for the payment…" : `Pay ${rupees(started.dueNowPaise)}`}
          </button>
        ) : (
          <button type="button" onClick={onBack} className={primary}>
            Start again
          </button>
        )}
        <a href={started.url} className="py-2 text-center text-[0.85rem] text-bk-muted underline underline-offset-4">
          Your booking page
        </a>
      </div>
      <p className="mt-3 text-[0.8rem] leading-snug text-bk-muted">Payments are processed by Razorpay. The resort confirms your booking by email and on your booking page.</p>
    </section>
  );
}

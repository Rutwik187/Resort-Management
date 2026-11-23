"use client";

import { useId, useState, type FormEvent } from "react";
import { currentCampaign, trackEvent } from "./consent";
import { DateInput, FieldError, contactErrors } from "./form-fields";
import { FormConsent, formConsent, type FormConsentValue } from "./form-consent";

/*
 * The corporate enquiry (CRP-02, CRP-05): company, GSTIN, the contact,
 * dates, guests and rooms, day or overnight, meals, the meeting hall and AV,
 * and the budget. It becomes a Corporate lead in the admin for the resort
 * chosen. A group bigger than the website takes asks here too: the team
 * holds the rooms and quotes.
 */

export type CorporateEnquiry = {
  property: string;
  company: string;
  gstin: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
  dateFrom: string;
  dateTo: string;
  guests: string;
  rooms: string;
  stay: "day" | "overnight";
  meals: string;
  meeting: string;
  budget: string;
  note: string;
  consent: FormConsentValue;
  campaign: Record<string, string>;
};

type Props = {
  /** The resorts to choose from, this one first. */
  resorts: { code: string; name: string }[];
  onSend: (enquiry: CorporateEnquiry) => Promise<{ ok: boolean }>;
  policyHref: string;
  /** The team's WhatsApp, offered if sending fails. */
  whatsapp: { number: string; display: string };
};

const field = "mt-1.5 w-full rounded-bk-control border border-bk-line bg-transparent px-4 py-3 text-[1rem] text-bk-ink outline-none transition-colors placeholder:text-bk-muted/60 focus:border-bk-ink";
const label = "block text-[0.9rem] text-bk-muted";

export function CorporateEnquiryForm({ resorts, onSend, policyHref, whatsapp }: Props) {
  const id = useId();
  const [errors, setErrors] = useState<{ name?: string; phone?: string; company?: string; email?: string }>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stay, setStay] = useState<"day" | "overnight">("overnight");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const found = {
      ...contactErrors(text("name"), text("phone")),
      company: text("company").length >= 2 ? undefined : "Add the company's name.",
      email: !text("email") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text("email")) ? undefined : "Check the email address.",
    };
    setErrors(found);
    const first = (["company", "name", "phone", "email"] as const).find((key) => found[key]);
    if (first) {
      (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
      return;
    }
    const consent = formConsent(form);
    if (!consent) return;
    setState("sending");
    const enquiry: CorporateEnquiry = {
      property: text("property") || resorts[0]?.code || "",
      company: text("company"),
      gstin: text("gstin").toUpperCase(),
      name: text("name"),
      designation: text("designation"),
      phone: text("phone"),
      email: text("email"),
      dateFrom,
      dateTo: stay === "overnight" ? dateTo : "",
      guests: text("guests"),
      rooms: stay === "overnight" ? text("rooms") : "",
      stay,
      meals: text("meals"),
      meeting: text("meeting"),
      budget: text("budget"),
      note: text("note"),
      consent,
      campaign: currentCampaign() as Record<string, string>,
    };
    try {
      const result = await onSend(enquiry);
      setState(result.ok ? "sent" : "failed");
      if (result.ok) trackEvent("generate_lead", { lead_type: "corporate" }, { event: "Lead", eventId: consent.eventId, params: { content_category: "corporate" } });
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-bk border border-bk-line bg-bk-card p-6 text-bk-ink">
        <p className="bk-display text-[1.6rem]">Thank you. We have your enquiry.</p>
        <p className="mt-2 text-bk-muted">Our team will call you soon with options and a quote. For anything urgent, WhatsApp {whatsapp.display}.</p>
      </div>
    );
  }

  const input = (name: string, text: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, error?: string) => (
    <div>
      <label className={label}>
        {text}
        <input name={name} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-${name}-error` : undefined} className={`${field} ${error ? "border-bk-alert" : ""}`} {...extra} />
      </label>
      <FieldError id={`${id}-${name}-error`} message={error} />
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 rounded-bk border border-bk-line bg-bk-card p-5 text-bk-ink sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        {input("company", "Company", { autoComplete: "organization", maxLength: 160 }, errors.company)}
        {input("gstin", "GSTIN (optional)", { maxLength: 15, className: `${field} uppercase` })}
        {input("name", "Contact person", { autoComplete: "name", maxLength: 80 }, errors.name)}
        {input("designation", "Designation", { autoComplete: "organization-title", maxLength: 80 })}
        {input("phone", "Phone", { type: "tel", inputMode: "tel", autoComplete: "tel" }, errors.phone)}
        {input("email", "Email", { type: "email", inputMode: "email", autoComplete: "email" }, errors.email)}
      </div>
      {resorts.length > 1 && (
        <label className={label}>
          Preferred resort
          <select name="property" defaultValue={resorts[0].code} className={field}>
            {resorts.map((resort) => (
              <option key={resort.code} value={resort.code}>
                {resort.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <fieldset>
        <legend className={label}>Day event or overnight?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["overnight", "day"] as const).map((value) => (
            <label key={value} className="cursor-pointer rounded-full border border-bk-line px-4 py-2 text-[0.95rem] has-[:checked]:border-bk-ink has-[:checked]:bg-bk-ink has-[:checked]:text-bk-card">
              <input type="radio" name="stay" value={value} checked={stay === value} onChange={() => setStay(value)} className="sr-only" />
              {value === "overnight" ? "Overnight, with rooms" : "Day event"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className={label}>{stay === "overnight" ? "Arrival" : "Date"}</span>
          <DateInput id={`${id}-from`} label={stay === "overnight" ? "Arrival" : "Date"} name="dateFrom" value={dateFrom} onChange={setDateFrom} className={field} />
        </div>
        {stay === "overnight" && (
          <div>
            <span className={label}>Departure</span>
            <DateInput id={`${id}-to`} label="Departure" name="dateTo" value={dateTo} onChange={setDateTo} className={field} />
          </div>
        )}
        {input("guests", "Number of guests", { type: "number", inputMode: "numeric", min: 1, max: 5000 })}
        {stay === "overnight" && input("rooms", "Rooms needed", { type: "number", inputMode: "numeric", min: 1, max: 500 })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Meals
          <select name="meals" defaultValue="All meals" className={field}>
            <option>All meals</option>
            <option>Breakfast and one meal</option>
            <option>Breakfast only</option>
            <option>Lunch and high tea (day event)</option>
            <option>Not sure yet</option>
          </select>
        </label>
        {input("budget", "Budget range", { placeholder: "Such as ₹2 to 3 lakh", maxLength: 80 })}
      </div>
      {input("meeting", "Meeting hall and AV needs", { placeholder: "Hall for 60, projector, two mics", maxLength: 300 })}
      <label className={label}>
        Anything else (optional)
        <textarea name="note" rows={3} maxLength={2000} className={`${field} resize-none`} placeholder="Team activities, a bonfire, transport from Pune" />
      </label>
      <FormConsent policyHref={policyHref} boxClassName="accent-[var(--bk-accent)]" className="text-bk-muted" />
      {state === "failed" && (
        <p role="alert" className="text-[0.9rem] text-bk-alert">
          The enquiry didn&apos;t go through. Please try again, or WhatsApp {whatsapp.display}.
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className="bk-button min-h-12 rounded-bk-control bg-bk-accent px-6 text-bk-accent-ink disabled:opacity-60 sm:justify-self-start">
        {state === "sending" ? "Sending…" : "Send the enquiry"}
      </button>
    </form>
  );
}

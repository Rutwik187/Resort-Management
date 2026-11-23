"use client";

import { useId, useState, type FormEvent } from "react";
import { DateInput, FieldError, contactErrors } from "@repo/booking-ui";
import { currentCampaign, trackEvent } from "@repo/booking-ui/consent";
import { FormConsent, formConsent } from "@repo/booking-ui/form-consent";
import { sendGroupEnquiry } from "@/app/actions";

const field = "mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-[0.98rem] outline-none focus:border-forest";

/** A wedding or event enquiry for any of the four resorts (URD 4.1). It becomes a lead at that resort. */
export function WeddingForm({ resorts }: { resorts: { code: string; name: string }[] }) {
  const id = useId();
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const found = contactErrors(String(data.get("name") ?? ""), String(data.get("phone") ?? ""));
    setErrors(found);
    if (found.name || found.phone) return;
    const consent = formConsent(form);
    if (!consent) return;
    setState("sending");
    const purpose = String(data.get("purpose") ?? "wedding");
    const result = await sendGroupEnquiry(String(data.get("property")), {
      purpose,
      name: data.get("name"),
      phone: data.get("phone"),
      email: data.get("email") || undefined,
      date: date || undefined,
      guests: data.get("guests") || undefined,
      note: [`From the group website.`, data.get("note") ? `Note: ${data.get("note")}` : ""].filter(Boolean).join("\n"),
      consent,
      campaign: currentCampaign(),
    }).catch(() => ({ ok: false }));
    setState(result.ok ? "sent" : "failed");
    if (result.ok) trackEvent("generate_lead", { lead_type: purpose }, { event: "Lead", eventId: consent.eventId, params: { content_category: purpose } });
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-3xl bg-white p-6">
        <p className="display text-[1.8rem]">Thank you. We have your enquiry.</p>
        <p className="mt-2 text-muted">The resort&apos;s events team will call you soon.</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-3xl bg-white p-5 md:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-[0.85rem] text-muted">
          Resort
          <select name="property" className={field}>
            {resorts.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[0.85rem] text-muted">
          Occasion
          <select name="purpose" className={field} defaultValue="wedding">
            <option value="wedding">A wedding</option>
            <option value="event">Another event: birthday, anniversary, reunion</option>
          </select>
        </label>
        <div>
          <label className="text-[0.85rem] text-muted">
            Your name
            <input name="name" autoComplete="name" className={field} aria-invalid={Boolean(errors.name) || undefined} aria-describedby={errors.name ? `${id}-name` : undefined} />
          </label>
          <FieldError id={`${id}-name`} message={errors.name} />
        </div>
        <div>
          <label className="text-[0.85rem] text-muted">
            Phone
            <input name="phone" type="tel" autoComplete="tel" className={field} aria-invalid={Boolean(errors.phone) || undefined} aria-describedby={errors.phone ? `${id}-phone` : undefined} />
          </label>
          <FieldError id={`${id}-phone`} message={errors.phone} />
        </div>
        <label className="text-[0.85rem] text-muted">
          Email (optional)
          <input name="email" type="email" autoComplete="email" className={field} />
        </label>
        <div className="text-[0.85rem] text-muted">
          <span>Date</span>
          <DateInput id={`${id}-date`} label="Date" name="date" value={date} onChange={setDate} className={field} />
        </div>
        <label className="text-[0.85rem] text-muted">
          Guests
          <input name="guests" type="number" min={1} max={5000} className={field} />
        </label>
      </div>
      <label className="text-[0.85rem] text-muted">
        Anything else (optional)
        <textarea name="note" rows={3} className={`${field} resize-none`} />
      </label>
      <FormConsent policyHref="/policies" boxClassName="accent-[#1f3d30]" className="text-muted" />
      {state === "failed" && (
        <p role="alert" className="text-clay">
          The enquiry didn&apos;t go through. Please try again.
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className="min-h-12 rounded-full bg-forest px-6 font-medium text-white disabled:opacity-60 sm:justify-self-start">
        {state === "sending" ? "Sending…" : "Send the enquiry"}
      </button>
    </form>
  );
}

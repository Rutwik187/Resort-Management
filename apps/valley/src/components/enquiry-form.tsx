"use client";

import { useId, useState, type CSSProperties, type FormEvent } from "react";
import { contact } from "@/content/resort";

export const purposes = [
  { value: "stay", label: "A cottage stay", dateLabel: "Check-in date" },
  { value: "group", label: "A group trip", dateLabel: "Check-in date" },
  { value: "wedding", label: "A wedding", dateLabel: "Wedding date" },
  { value: "event", label: "An event or offsite", dateLabel: "Event date" },
] as const;

export type Purpose = (typeof purposes)[number]["value"];

export const isPurpose = (value: unknown): value is Purpose => purposes.some((p) => p.value === value);

const field =
  "w-full border-0 border-b border-ink/25 bg-transparent px-0 pb-3 pt-1 text-[1.05rem] text-ink placeholder:text-moss/60 transition-colors duration-200 focus:border-laterite focus:outline-none focus-visible:outline-none";

type EnquiryFormProps = {
  defaultPurpose?: Purpose;
  /** One column, for the narrow booking drawer. */
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * The booking enquiry. It opens WhatsApp with the details filled in. The
 * resort has one number for calls and WhatsApp, so every purpose goes there,
 * and the first line of the message says what it is about.
 */
export function EnquiryForm({ defaultPurpose = "stay", compact = false, className = "", style }: EnquiryFormProps) {
  const id = useId();
  const [purpose, setPurpose] = useState<Purpose>(defaultPurpose);
  const chosen = purposes.find((p) => p.value === purpose) ?? purposes[0];
  const staying = purpose === "stay" || purpose === "group";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const lines = [
      "Hello Prathamesh Valley Resorts, I would like to plan:",
      chosen.label,
      `Name: ${data.get("name")}`,
      `Phone: ${data.get("phone")}`,
      data.get("date") ? `${chosen.dateLabel}: ${data.get("date")}` : "",
      data.get("nights") ? `Nights: ${data.get("nights")}` : "",
      data.get("guests") ? `Guests: ${data.get("guests")}` : "",
      data.get("note") ? `Note: ${data.get("note")}` : "",
    ].filter(Boolean);
    window.open(`https://wa.me/${contact.whatsapp.number}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={onSubmit} className={`grid ${compact ? "gap-8" : "gap-9"} ${className}`} style={style}>
      <fieldset>
        <legend className="label mb-5 text-moss">What are you planning?</legend>
        <div className="flex flex-wrap gap-2.5">
          {purposes.map((p) => (
            <label
              key={p.value}
              className="relative cursor-pointer rounded-[3px] px-4 py-2.5 text-[0.95rem] shadow-[inset_0_0_0_1px_rgb(28_43_47/0.25)] transition-[background-color,color,box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_rgb(28_43_47/0.6)] has-[:checked]:bg-ink has-[:checked]:text-mist has-[:checked]:shadow-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-strawberry"
            >
              <input
                type="radio"
                name="purpose"
                value={p.value}
                checked={purpose === p.value}
                onChange={() => setPurpose(p.value)}
                className="sr-only"
              />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={`grid ${compact ? "gap-8" : "gap-9 sm:grid-cols-2"}`}>
        <div>
          <label htmlFor={`${id}-name`} className="block text-[0.9rem] text-moss">
            Your name
          </label>
          <input id={`${id}-name`} name="name" required autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="block text-[0.9rem] text-moss">
            Phone number
          </label>
          <input
            id={`${id}-phone`}
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            pattern="[0-9+\s\-]{8,}"
            title="Enter a phone number with at least 8 digits"
            className={field}
          />
        </div>
        <div className={compact ? "grid grid-cols-2 gap-6" : "contents"}>
          <div className={compact && !staying ? "col-span-2" : ""}>
            <label htmlFor={`${id}-date`} className="block text-[0.9rem] text-moss">
              {chosen.dateLabel}
            </label>
            <input id={`${id}-date`} name="date" type="date" className={field} />
          </div>
          {staying && (
            <div>
              <label htmlFor={`${id}-nights`} className="block text-[0.9rem] text-moss">
                Nights
              </label>
              <input id={`${id}-nights`} name="nights" type="number" min={1} inputMode="numeric" className={field} />
            </div>
          )}
        </div>
        <div>
          <label htmlFor={`${id}-guests`} className="block text-[0.9rem] text-moss">
            Number of guests
          </label>
          <input id={`${id}-guests`} name="guests" type="number" min={1} inputMode="numeric" className={field} />
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-note`} className="block text-[0.9rem] text-moss">
          Anything we should know <span className="text-moss/80">(optional)</span>
        </label>
        <textarea id={`${id}-note`} name="note" rows={2} className={`${field} resize-none`} />
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <button type="submit" className="btn btn-ink" aria-describedby={`${id}-dest`}>
          Send on WhatsApp <span aria-hidden className="btn-arrow">→</span>
        </button>
        <p id={`${id}-dest`} className="text-[0.9rem] text-moss">
          Goes to {contact.whatsapp.display}
        </p>
      </div>
    </form>
  );
}

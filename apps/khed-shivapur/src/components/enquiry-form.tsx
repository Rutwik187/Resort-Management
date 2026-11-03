"use client";

import { useId, useState, type CSSProperties, type FormEvent } from "react";
import { contact } from "@/content/resort";
import { Roll } from "./roll";

export const purposes = [
  { value: "stay", label: "A stay" },
  { value: "day", label: "A day package" },
  { value: "wedding", label: "A wedding" },
  { value: "event", label: "A corporate or private event" },
] as const;

export type Purpose = (typeof purposes)[number]["value"];

export const isPurpose = (value: unknown): value is Purpose => purposes.some((p) => p.value === value);

const field =
  "w-full border-0 border-b border-forest/25 bg-transparent px-0 pb-3 pt-1 text-[1.05rem] text-forest placeholder:text-fern/60 transition-colors duration-200 focus:border-sun-deep focus:outline-none focus-visible:outline-none";

type EnquiryFormProps = {
  defaultPurpose?: Purpose;
  /** One column, for the narrow booking drawer. */
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * The booking enquiry. It opens WhatsApp with the details filled in, to the
 * wedding team for weddings and to reservations for everything else.
 */
export function EnquiryForm({ defaultPurpose = "stay", compact = false, className = "", style }: EnquiryFormProps) {
  const id = useId();
  const [purpose, setPurpose] = useState<Purpose>(defaultPurpose);
  const isWedding = purpose === "wedding";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const label = purposes.find((p) => p.value === purpose)?.label ?? "A stay";
    const lines = [
      "Hello Prathamesh Resorts, I would like to plan:",
      `${label}`,
      `Name: ${data.get("name")}`,
      `Phone: ${data.get("phone")}`,
      data.get("date") ? `Date: ${data.get("date")}` : "",
      data.get("guests") ? `Guests: ${data.get("guests")}` : "",
      data.get("note") ? `Note: ${data.get("note")}` : "",
    ].filter(Boolean);
    const number = isWedding ? contact.weddingPhone.number : contact.whatsapp.number;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={onSubmit} className={`grid ${compact ? "gap-8" : "gap-9"} ${className}`} style={style}>
      <fieldset>
        <legend className="label mb-5 text-fern">What are you planning?</legend>
        <div className="flex flex-wrap gap-2.5">
          {purposes.map((p) => (
            <label
              key={p.value}
              className="relative cursor-pointer rounded-full px-4 py-2.5 text-[0.95rem] shadow-[inset_0_0_0_1px_rgb(17_38_29/0.25)] transition-[background-color,color,box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_rgb(17_38_29/0.6)] has-[:checked]:bg-forest has-[:checked]:text-paper has-[:checked]:shadow-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sun"
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
          <label htmlFor={`${id}-name`} className="block text-[0.9rem] text-fern">
            Your name
          </label>
          <input id={`${id}-name`} name="name" required autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="block text-[0.9rem] text-fern">
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
          <div>
            <label htmlFor={`${id}-date`} className="block text-[0.9rem] text-fern">
              {isWedding ? "Wedding date" : "Date"}
            </label>
            <input id={`${id}-date`} name="date" type="date" className={field} />
          </div>
          <div>
            <label htmlFor={`${id}-guests`} className="block text-[0.9rem] text-fern">
              Number of guests
            </label>
            <input id={`${id}-guests`} name="guests" type="number" min={1} inputMode="numeric" className={field} />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-note`} className="block text-[0.9rem] text-fern">
          Anything we should know <span className="text-fern/70">(optional)</span>
        </label>
        <textarea id={`${id}-note`} name="note" rows={2} className={`${field} resize-none`} />
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <button type="submit" className="btn btn-forest" aria-describedby={`${id}-dest`}>
          <Roll>Send on WhatsApp</Roll>
        </button>
        <p id={`${id}-dest`} className="text-[0.9rem] text-fern">
          Goes to {isWedding ? contact.weddingPhone.display : contact.whatsapp.display}
        </p>
      </div>
    </form>
  );
}

"use client";

import { useId, useState, type CSSProperties, type FormEvent } from "react";
import { CountInput, DateInput, FieldError, contactErrors, formatLong, type ContactErrors } from "@repo/booking-ui";
import { contact } from "@/content/resort";
import { sendEnquiry } from "@/app/actions";

export const purposes = [
  { value: "stay", label: "A room" },
  { value: "villa", label: "A villa" },
  { value: "wedding", label: "A wedding" },
  { value: "event", label: "An event" },
] as const;

export type Purpose = (typeof purposes)[number]["value"];

export const isPurpose = (value: unknown): value is Purpose => purposes.some((p) => p.value === value);

/** Weddings go to the wedding team. Everything else goes to the resort's WhatsApp. */
const destination = (purpose: Purpose) =>
  purpose === "wedding"
    ? { number: contact.weddingPhone.number, display: contact.weddingPhone.display }
    : { number: contact.whatsapp.number, display: contact.whatsapp.display };

const field =
  "w-full rounded-[2px] border border-ink/20 bg-mist/60 px-4 py-3 text-[1.02rem] text-ink placeholder:text-slate/60 transition-[border-color,background-color] duration-300 focus:border-ink/60 focus:bg-mist focus:outline-none focus-visible:outline-none";

type EnquiryFormProps = {
  defaultPurpose?: Purpose;
  /** One column, for the narrow booking drawer. */
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** The enquiry. It opens WhatsApp with the details filled in, ready to send. */
export function EnquiryForm({ defaultPurpose = "stay", compact = false, className = "", style }: EnquiryFormProps) {
  const id = useId();
  const [purpose, setPurpose] = useState<Purpose>(defaultPurpose);
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const to = destination(purpose);
  const dateLabel = purpose === "wedding" ? "Wedding date" : purpose === "event" ? "Event date" : "Check-in date";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const found = contactErrors(String(data.get("name") ?? ""), String(data.get("phone") ?? ""));
    setErrors(found);
    if (found.name || found.phone) {
      (form.elements.namedItem(found.name ? "name" : "phone") as HTMLInputElement | null)?.focus();
      return;
    }
    const label = purposes.find((p) => p.value === purpose)?.label ?? "A room";
    const lines = [
      "Hello Sinhagad Bliss, I would like to plan:",
      label,
      `Name: ${data.get("name")}`,
      `Phone: ${data.get("phone")}`,
      date ? `${dateLabel}: ${formatLong(date)}` : "",
      data.get("guests") ? `Guests: ${data.get("guests")}` : "",
      data.get("note") ? `Note: ${data.get("note")}` : "",
    ].filter(Boolean);
    window.open(`https://wa.me/${to.number}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
    // Kept as a lead in the admin too. WhatsApp has opened already, so this never holds the guest up.
    sendEnquiry({ purpose, name: data.get("name"), phone: data.get("phone"), date: date || undefined, guests: data.get("guests") || undefined, note: lines.join("\n") }).catch(() => undefined);
  }

  return (
    <form onSubmit={onSubmit} noValidate className={`grid ${compact ? "gap-7" : "gap-8"} ${className}`} style={style}>
      <fieldset>
        <legend className="kicker mb-4 text-slate">What would you like to plan?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {purposes.map((p) => (
            <label
              key={p.value}
              className="relative flex min-h-12 cursor-pointer items-center justify-center rounded-[2px] px-3 text-center text-[0.95rem] shadow-[inset_0_0_0_1px_rgb(30_38_50/0.2)] transition-[background-color,color,box-shadow] duration-300 hover:shadow-[inset_0_0_0_1px_rgb(30_38_50/0.55)] has-[:checked]:bg-ink has-[:checked]:text-mist has-[:checked]:shadow-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-apricot-deep"
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

      <div className={`grid gap-6 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div>
          <label htmlFor={`${id}-name`} className="kicker mb-2 block text-slate">
            Your name
          </label>
          <input
            id={`${id}-name`}
            name="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
            onChange={() => errors.name && setErrors({ ...errors, name: undefined })}
            className={field}
          />
          <FieldError id={`${id}-name-error`} message={errors.name} />
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="kicker mb-2 block text-slate">
            Phone number
          </label>
          <input
            id={`${id}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone) || undefined}
            aria-describedby={errors.phone ? `${id}-phone-error` : undefined}
            onChange={() => errors.phone && setErrors({ ...errors, phone: undefined })}
            className={field}
          />
          <FieldError id={`${id}-phone-error`} message={errors.phone} />
        </div>
        <div>
          <label htmlFor={`${id}-date`} className="kicker mb-2 block text-slate">
            {dateLabel}
          </label>
          <DateInput id={`${id}-date`} label={dateLabel} name="date" value={date} onChange={setDate} className={field} />
        </div>
        <div>
          <label htmlFor={`${id}-guests`} className="kicker mb-2 block text-slate">
            Guests
          </label>
          <CountInput id={`${id}-guests`} label="Guests" name="guests" value={guests} onChange={setGuests} min={1} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-note`} className="kicker mb-2 block text-slate">
          Anything we should know <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea id={`${id}-note`} name="note" rows={3} className={`${field} resize-none`} />
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <button type="submit" className="btn btn-ink" aria-describedby={`${id}-to`}>
          Send on WhatsApp
        </button>
        <p id={`${id}-to`} className="text-[0.92rem] text-slate">
          Goes to <span className="tabular-nums">{to.display}</span>
          {purpose === "wedding" ? ", the wedding team" : ""}
        </p>
      </div>
    </form>
  );
}

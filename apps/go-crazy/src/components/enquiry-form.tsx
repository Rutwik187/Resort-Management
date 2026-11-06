"use client";

import { useId, useState, type CSSProperties, type FormEvent } from "react";
import { CountInput, DateInput, FieldError, contactErrors, formatLong, type ContactErrors } from "@repo/booking-ui";
import { contact, dayPasses, formatRupees, stays, type DayPass } from "@/content/resort";
import { sendEnquiry } from "@/app/actions";

export const purposes = [
  { value: "day", label: "A day out" },
  { value: "stay", label: "A stay" },
  { value: "school", label: "A school trip" },
  { value: "wedding", label: "A wedding" },
  { value: "event", label: "A company or private event" },
] as const;

export type Purpose = (typeof purposes)[number]["value"];

export const isPurpose = (value: unknown): value is Purpose => purposes.some((p) => p.value === value);

const field =
  "w-full rounded-[3px] border-0 bg-chalk px-3.5 py-3 text-[1.02rem] text-ink shadow-[inset_0_0_0_1.5px_rgb(14_26_20/0.22)] placeholder:text-stone/70 transition-shadow duration-150 focus:shadow-[inset_0_0_0_2px_var(--color-ink)] focus:outline-none focus-visible:outline-none";
const labelText = "mb-2 block text-[0.88rem] font-semibold text-ink";
const choice =
  "relative flex min-h-11 cursor-pointer items-center rounded-[3px] px-3.5 text-[0.95rem] font-semibold shadow-[inset_0_0_0_1.5px_rgb(14_26_20/0.22)] transition-[background-color,color,box-shadow] duration-150 hover:shadow-[inset_0_0_0_1.5px_rgb(14_26_20/0.7)] has-[:checked]:bg-ink has-[:checked]:text-lime has-[:checked]:shadow-none has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sun";

type EnquiryFormProps = {
  defaultPurpose?: Purpose;
  defaultPass?: DayPass["id"];
  /** One column, for the narrow booking drawer. */
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Whole numbers from a number field, never below zero. */
const count = (value: string) => Math.max(0, Math.floor(Number(value) || 0));

/**
 * The booking enquiry. It opens WhatsApp with the details filled in. For a
 * day out it also works out an estimate from the pass prices, plus GST.
 */
export function EnquiryForm({ defaultPurpose = "day", defaultPass = "morning", compact = false, className = "", style }: EnquiryFormProps) {
  const id = useId();
  const [purpose, setPurpose] = useState<Purpose>(defaultPurpose);
  const [passId, setPassId] = useState<DayPass["id"]>(defaultPass);
  const [adults, setAdults] = useState("2");
  const [kids, setKids] = useState("0");
  const [littleKids, setLittleKids] = useState("0");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");
  const [students, setStudents] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});

  const pass = dayPasses.find((p) => p.id === passId) ?? dayPasses[0];
  const estimate = count(adults) * pass.adult + count(kids) * pass.child5to11 + count(littleKids) * pass.child3to5;

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
    const label = purposes.find((p) => p.value === purpose)?.label ?? "A day out";
    const lines = [
      "Hello Prathamesh Go Crazy, I would like to plan:",
      label,
      `Name: ${data.get("name")}`,
      `Phone: ${data.get("phone")}`,
      date ? `Date: ${formatLong(date)}` : "",
    ];
    if (purpose === "day") {
      lines.push(
        `Day pass: ${pass.name}, ${pass.hours}`,
        `Adults: ${count(adults)}`,
        `Children aged 5 to 11: ${count(kids)}`,
        `Children aged 3 to 5: ${count(littleKids)}`,
        estimate > 0 ? `Estimate from the website: ${formatRupees(estimate)} plus GST` : "",
      );
    } else if (purpose === "stay") {
      lines.push(data.get("stay") ? `Stay: ${data.get("stay")}` : "", data.get("guests") ? `Guests: ${data.get("guests")}` : "");
    } else if (purpose === "school") {
      lines.push(
        data.get("school") ? `School or college: ${data.get("school")}` : "",
        data.get("students") ? `Students: ${data.get("students")}` : "",
      );
    } else {
      lines.push(data.get("guests") ? `Guests: ${data.get("guests")}` : "");
    }
    if (data.get("note")) lines.push(`Note: ${data.get("note")}`);
    const text = lines.filter(Boolean).join("\n");
    window.open(`https://wa.me/${contact.whatsapp.number}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    // Kept as a lead in the admin too. WhatsApp has opened already, so this never holds the guest up.
    sendEnquiry({ purpose, name: data.get("name"), phone: data.get("phone"), date: date || undefined, guests: data.get("guests") || undefined, note: text }).catch(() => undefined);
  }

  const twoUp = compact ? "grid grid-cols-2 gap-4" : "grid gap-5 sm:grid-cols-2";

  return (
    <form onSubmit={onSubmit} noValidate className={`grid gap-7 ${className}`} style={style}>
      <fieldset>
        <legend className="label mb-4 text-stone">What are you planning?</legend>
        <div className="flex flex-wrap gap-2">
          {purposes.map((p) => (
            <label key={p.value} className={choice}>
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

      {purpose === "day" && (
        <fieldset className="grid gap-5">
          <legend className="label mb-4 text-stone">Which pass?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {dayPasses.map((p) => (
              <label
                key={p.id}
                className="relative cursor-pointer rounded-[3px] px-3 py-2.5 shadow-[inset_0_0_0_1.5px_rgb(14_26_20/0.22)] transition-[background-color,box-shadow] duration-150 hover:shadow-[inset_0_0_0_1.5px_rgb(14_26_20/0.7)] has-[:checked]:bg-lime has-[:checked]:shadow-[inset_0_0_0_1.5px_var(--color-ink)] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sun"
              >
                <input
                  type="radio"
                  name="pass"
                  value={p.id}
                  checked={passId === p.id}
                  onChange={() => setPassId(p.id)}
                  className="sr-only"
                />
                <span className="display block text-[1.35rem] leading-none">{p.name}</span>
                <span className="mt-1 block text-[0.8rem] leading-tight text-stone">{p.hours}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor={`${id}-adults`} className={labelText}>
                Adults
              </label>
              <CountInput id={`${id}-adults`} label="Adults" value={adults} onChange={setAdults} min={0} max={999} className={field} />
            </div>
            <div>
              <label htmlFor={`${id}-kids`} className={labelText}>
                Age 5 to 11
              </label>
              <CountInput id={`${id}-kids`} label="Age 5 to 11" value={kids} onChange={setKids} min={0} max={999} className={field} />
            </div>
            <div>
              <label htmlFor={`${id}-little`} className={labelText}>
                Age 3 to 5
              </label>
              <CountInput id={`${id}-little`} label="Age 3 to 5" value={littleKids} onChange={setLittleKids} min={0} max={999} className={field} />
            </div>
          </div>
          <p aria-live="polite" className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-y-2 border-ink py-3">
            <span className="label">Estimate</span>
            <span>
              <span className="figure text-[2.2rem]">{formatRupees(estimate)}</span>
              <span className="ml-2 text-[0.9rem] text-stone">plus GST</span>
            </span>
          </p>
        </fieldset>
      )}

      <div className={compact ? "grid gap-5" : "grid gap-5 sm:grid-cols-2"}>
        <div>
          <label htmlFor={`${id}-name`} className={labelText}>
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
          <label htmlFor={`${id}-phone`} className={labelText}>
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
      </div>

      <div className={twoUp}>
        <div>
          <label htmlFor={`${id}-date`} className={labelText}>
            {purpose === "stay" ? "Check-in date" : purpose === "wedding" ? "Wedding date" : "Date"}
          </label>
          <DateInput
            id={`${id}-date`}
            label={purpose === "stay" ? "Check-in date" : purpose === "wedding" ? "Wedding date" : "Date"}
            name="date"
            value={date}
            onChange={setDate}
            className={field}
          />
        </div>
        {purpose === "stay" && (
          <div>
            <label htmlFor={`${id}-guests`} className={labelText}>
              Guests
            </label>
            <CountInput id={`${id}-guests`} label="Guests" name="guests" value={guests} onChange={setGuests} min={1} className={field} />
          </div>
        )}
        {purpose === "school" && (
          <div>
            <label htmlFor={`${id}-students`} className={labelText}>
              Students
            </label>
            <CountInput id={`${id}-students`} label="Students" name="students" value={students} onChange={setStudents} min={1} className={field} />
          </div>
        )}
        {(purpose === "wedding" || purpose === "event") && (
          <div>
            <label htmlFor={`${id}-guests`} className={labelText}>
              Guests
            </label>
            <CountInput id={`${id}-guests`} label="Guests" name="guests" value={guests} onChange={setGuests} min={1} className={field} />
          </div>
        )}
      </div>

      {purpose === "stay" && (
        <fieldset>
          <legend className={labelText}>Which stay?</legend>
          <div className="flex flex-wrap gap-2">
            {[{ value: "", label: "Not sure yet" }, ...stays.map((s) => ({ value: s.name, label: s.name }))].map((option) => (
              <label key={option.label} className={choice}>
                <input type="radio" name="stay" value={option.value} defaultChecked={option.value === ""} className="sr-only" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {purpose === "school" && (
        <div>
          <label htmlFor={`${id}-school`} className={labelText}>
            School or college
          </label>
          <input id={`${id}-school`} name="school" autoComplete="organization" className={field} />
        </div>
      )}

      <div>
        <label htmlFor={`${id}-note`} className={labelText}>
          Anything we should know <span className="font-normal text-stone">(optional)</span>
        </label>
        <textarea id={`${id}-note`} name="note" rows={2} className={`${field} resize-none`} />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" className="btn btn-ink" aria-describedby={`${id}-dest`}>
          Send on WhatsApp <span aria-hidden className="arrow">→</span>
        </button>
        <p id={`${id}-dest`} className="text-[0.9rem] text-stone">
          Opens WhatsApp to {contact.whatsapp.display}
        </p>
      </div>
    </form>
  );
}

"use client";

import { useId, useState, type FormEvent } from "react";
import { contact } from "@/content/resort";
import { InView, RiseLines } from "./in-view";

const purposes = [
  { value: "stay", label: "A stay" },
  { value: "day", label: "A day package" },
  { value: "wedding", label: "A wedding" },
  { value: "event", label: "A corporate or private event" },
] as const;

type Purpose = (typeof purposes)[number]["value"];

const field =
  "w-full border-0 border-b border-sage/35 bg-transparent px-0 pb-3 pt-1 text-[1.05rem] text-mist placeholder:text-sage/60 transition-colors duration-200 focus:border-zari focus:outline-none focus-visible:outline-none";

export function Enquiry({ defaultPurpose = "stay" }: { defaultPurpose?: Purpose }) {
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
    <section id="enquire" aria-labelledby={`${id}-title`} className="scroll-mt-0 bg-moss text-mist">
      <InView className="mx-auto grid max-w-[1600px] gap-16 px-5 py-24 md:px-10 md:py-36 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <h2 id={`${id}-title`} className="text-[clamp(3rem,7vw,6.5rem)]">
            <RiseLines lines={["Plan your", "stay"]} />
          </h2>
          <p className="fade mt-8 max-w-md text-sage">
            Tell us when you would like to come and how many of you there are. The form opens WhatsApp with your
            details filled in, and our reservations team replies with availability.
          </p>
          <dl className="fade mt-12 grid gap-6 text-[0.95rem]" style={{ "--i": 2 } as React.CSSProperties}>
            <div>
              <dt className="text-sage">Reservations</dt>
              <dd>
                <a className="link-line" href={contact.bookingPhone.href}>
                  {contact.bookingPhone.display}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sage">Weddings, by call or WhatsApp</dt>
              <dd>
                <a className="link-line" href={contact.weddingPhone.href}>
                  {contact.weddingPhone.display}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sage">Email</dt>
              <dd>
                <a className="link-line" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <form onSubmit={onSubmit} className="fade grid gap-9 lg:col-span-6 lg:col-start-7" style={{ "--i": 1 } as React.CSSProperties}>
          <fieldset>
            <legend className="mb-4 text-[0.95rem] text-sage">What are you planning?</legend>
            <div className="flex flex-wrap gap-2.5">
              {purposes.map((p) => (
                <label
                  key={p.value}
                  className="relative cursor-pointer rounded-full px-4 py-2.5 text-[0.95rem] shadow-[inset_0_0_0_1px_rgb(169_184_168/0.4)] transition-[background-color,color,box-shadow] duration-200 has-[:checked]:bg-zari has-[:checked]:text-moss has-[:checked]:shadow-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-zari"
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

          <div className="grid gap-9 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-name`} className="block text-[0.9rem] text-sage">
                Your name
              </label>
              <input id={`${id}-name`} name="name" required autoComplete="name" className={field} />
            </div>
            <div>
              <label htmlFor={`${id}-phone`} className="block text-[0.9rem] text-sage">
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
            <div>
              <label htmlFor={`${id}-date`} className="block text-[0.9rem] text-sage">
                {isWedding ? "Wedding date" : "Date"}
              </label>
              <input id={`${id}-date`} name="date" type="date" className={`${field} [color-scheme:dark]`} />
            </div>
            <div>
              <label htmlFor={`${id}-guests`} className="block text-[0.9rem] text-sage">
                Number of guests
              </label>
              <input id={`${id}-guests`} name="guests" type="number" min={1} inputMode="numeric" className={field} />
            </div>
          </div>

          <div>
            <label htmlFor={`${id}-note`} className="block text-[0.9rem] text-sage">
              Anything we should know <span className="text-sage">(optional)</span>
            </label>
            <textarea id={`${id}-note`} name="note" rows={2} className={`${field} resize-none`} />
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <button type="submit" className="btn btn-zari" aria-describedby={`${id}-dest`}>
              Send on WhatsApp
            </button>
            <p id={`${id}-dest`} className="text-[0.9rem] text-sage">
              Goes to {isWedding ? contact.weddingPhone.display : contact.whatsapp.display}
            </p>
          </div>
        </form>
      </InView>
    </section>
  );
}

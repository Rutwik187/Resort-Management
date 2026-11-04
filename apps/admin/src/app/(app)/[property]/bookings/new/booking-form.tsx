"use client";

import { useActionState, useState, useTransition } from "react";
import { FormNote } from "@/components/form-note";
import { methodLabel, plural, price, rupees, shortDate, sourceLabel, offlineSources } from "@/lib/format";
import { createOffline, quoteOffline, type BookingRequest, type QuoteView } from "./actions";

/** A room type, or a ticket for a package, activity or sitting, that can be added. */
export type Option = { id: string; name: string; available: number; closedReason: string | null; maxAdults: number; maxGuests: number; extraBedAllowed: boolean };
type Band = { code: string; label: string };
type Line = { key: number; id: string; adults: number; children: Record<string, number>; extraBeds: number };

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[0.88rem]">{label}</span>
      <span className="flex items-center gap-1">
        <button type="button" aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="button-quiet size-8 justify-center p-0 disabled:opacity-40">
          −
        </button>
        <span className="w-7 text-center font-semibold" aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="button-quiet size-8 justify-center p-0 disabled:opacity-40">
          +
        </button>
      </span>
    </div>
  );
}

const guestsIn = (line: Line) => line.adults + Object.values(line.children).reduce((sum, n) => sum + n, 0);

export function NewBookingForm({
  propertyId,
  kind,
  dates,
  options,
  bands,
  canOverride,
  canTakePayment,
}: {
  propertyId: string;
  kind: "stay" | "day";
  dates: { checkIn: string; checkOut: string } | { day: string };
  options: Option[];
  bands: Band[];
  canOverride: boolean;
  canTakePayment: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [quoting, startQuote] = useTransition();
  const [override, setOverride] = useState(false);
  const [payMethod, setPayMethod] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [state, action, pending] = useActionState(createOffline.bind(null, propertyId), undefined);

  const noun = kind === "stay" ? "room" : "ticket";
  const optionOf = (id: string) => options.find((o) => o.id === id)!;
  const used = (id: string) => lines.filter((l) => l.id === id).length;
  // Any change to the rooms or guests makes a shown price out of date.
  const change = (next: Line[]) => {
    setLines(next);
    setQuote(null);
  };
  const update = (key: number, patch: Partial<Line>) => change(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const add = (option: Option) => {
    change([...lines, { key: nextKey, id: option.id, adults: Math.min(2, option.maxAdults), children: {}, extraBeds: 0 }]);
    setNextKey(nextKey + 1);
  };

  const request: BookingRequest =
    "day" in dates
      ? { kind: "day", day: dates.day, lines: lines.map(({ id, adults, children }) => ({ id, adults, children })) }
      : { kind: "stay", checkIn: dates.checkIn, checkOut: dates.checkOut, lines: lines.map(({ id, adults, children, extraBeds }) => ({ id, adults, children, extraBeds })) };

  return (
    <form action={action} className="mt-6 grid gap-5 lg:grid-cols-[1fr_22rem]">
      <input type="hidden" name="request" value={JSON.stringify(request)} />
      <div className="grid content-start gap-5">
        {lines.length > 0 && (
          <section className="card p-5" aria-labelledby="party-heading">
            <h2 id="party-heading" className="font-semibold">
              Who is coming
            </h2>
            <ul className="mt-3 grid gap-3">
              {lines.map((line, index) => {
                const option = optionOf(line.id);
                const guests = guestsIn(line);
                return (
                  <li key={line.key} className="rounded-lg border border-line p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-medium">
                        {kind === "stay" ? `Room ${index + 1}: ` : ""}
                        {option.name}
                      </p>
                      <button type="button" onClick={() => change(lines.filter((l) => l.key !== line.key))} className="text-[0.82rem] text-danger underline underline-offset-2">
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:max-w-sm">
                      <Stepper label="Adults" value={line.adults} min={1} max={option.maxAdults} onChange={(adults) => update(line.key, { adults })} />
                      {bands.map((band) => (
                        <Stepper
                          key={band.code}
                          label={`Children, ${band.label}`}
                          value={line.children[band.code] ?? 0}
                          min={0}
                          max={option.maxGuests}
                          onChange={(n) => update(line.key, { children: { ...line.children, [band.code]: n } })}
                        />
                      ))}
                      {option.extraBedAllowed && <Stepper label="Extra beds" value={line.extraBeds} min={0} max={2} onChange={(extraBeds) => update(line.key, { extraBeds })} />}
                    </div>
                    {guests > option.maxGuests && (
                      <p className="mt-2 text-[0.85rem] text-danger">
                        {kind === "stay" ? `This room takes at most ${option.maxGuests} guests.` : `Only ${option.maxGuests} seats are left.`}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" disabled={quoting} onClick={() => startQuote(async () => setQuote(await quoteOffline(propertyId, request)))} className="button-quiet">
                {quoting ? "Checking…" : "Check the price"}
              </button>
              {quote?.error && (
                <p role="status" className="text-[0.88rem] text-danger">
                  {quote.error}
                </p>
              )}
            </div>
            {quote?.lines && (
              <div className="mt-3 rounded-lg bg-page p-3 text-[0.9rem]" role="status">
                <ul className="grid gap-1.5">
                  {quote.lines.map((line, i) => (
                    <li key={i}>
                      <div className="flex justify-between gap-3">
                        <span>{line.name}</span>
                        <span className="font-medium">{price(line.totalPaise)}</span>
                      </div>
                      {line.nights.length > 0 && (
                        <p className="text-[0.8rem] text-muted">
                          {line.nights.map((n) => `${shortDate(n.night)} ${price(n.paise)}${n.source !== "base" ? ` (${n.source === "date" ? "date price" : n.source})` : ""}`).join(" · ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 flex justify-between border-t border-line pt-2 font-semibold">
                  <span>Total</span>
                  <span>{price(quote.totalPaise)}</span>
                </p>
                {quote.totalPaise === null && <p className="mt-1 text-[0.82rem] text-muted">A rate these guests need is not published. Book now and set the price on the booking, or set it below.</p>}
              </div>
            )}
          </section>
        )}
        <section className="card p-5" aria-labelledby="choose-heading">
          <h2 id="choose-heading" className="font-semibold">
            {kind === "stay" ? "Rooms free for these dates" : "Tickets for this day"}
          </h2>
          {options.length === 0 ? (
            <p className="mt-2 text-muted">{kind === "stay" ? "This resort has no room types on sale." : "This resort has no packages, activities or sittings on sale."}</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {options.map((option) => {
                const left = option.available - (kind === "stay" ? used(option.id) : 0);
                const blocked = option.closedReason ?? (option.available <= 0 ? (kind === "stay" ? "Sold out." : "Full.") : kind === "day" && used(option.id) > 0 ? "Added." : left <= 0 ? "All free ones added." : null);
                return (
                  <li key={option.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium">{option.name}</p>
                      <p className="text-[0.82rem] text-muted">{blocked ?? (kind === "stay" ? `${plural(left, "room")} free` : `${plural(option.available, "seat")} left`)}</p>
                    </div>
                    <button type="button" disabled={Boolean(blocked)} onClick={() => add(option)} className="button-quiet shrink-0 disabled:opacity-40">
                      Add {noun}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid content-start gap-5">
        <section className="card grid gap-3 p-5" aria-labelledby="guest-heading">
          <h2 id="guest-heading" className="font-semibold">
            Guest
          </h2>
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" required minLength={2} autoComplete="off" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="off" className="field" placeholder="98765 43210" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="off" className="field" />
          </div>
          <details>
            <summary className="cursor-pointer text-[0.88rem] text-muted">Company and GSTIN, for a company invoice</summary>
            <div className="mt-2 grid gap-3">
              <input name="companyName" aria-label="Company name" placeholder="Company name" className="field" />
              <input name="companyGstin" aria-label="Company GSTIN" placeholder="GSTIN" className="field uppercase" />
            </div>
          </details>
          <div>
            <label className="label" htmlFor="source">
              Booked by
            </label>
            <select id="source" name="source" required defaultValue="phone" className="field">
              {offlineSources.map((source) => (
                <option key={source} value={source}>
                  {sourceLabel[source]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="notes">
              Notes for the team
            </label>
            <textarea id="notes" name="notes" rows={2} className="field" />
          </div>
        </section>

        {(canOverride || canTakePayment) && (
          <section className="card grid gap-3 p-5" aria-labelledby="money-heading">
            <h2 id="money-heading" className="font-semibold">
              Price and payment
            </h2>
            {canOverride && (
              <>
                <label className="flex items-center gap-2 text-[0.9rem]">
                  <input type="checkbox" name="override" checked={override} onChange={(e) => setOverride(e.target.checked)} className="size-4" />
                  Use a different price
                </label>
                {override && (
                  <div className="grid gap-2">
                    <input name="overridePrice" required inputMode="decimal" aria-label="Price for the whole booking, in rupees" placeholder="Price for the whole booking (₹)" className="field" />
                    <input name="overrideReason" required minLength={3} aria-label="Why the price is different" placeholder="Why, such as an agent rate" className="field" />
                  </div>
                )}
              </>
            )}
            {canTakePayment && (
              <>
                <div>
                  <label className="label" htmlFor="payMethod">
                    Payment taken now
                  </label>
                  <select id="payMethod" name="payMethod" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="field">
                    <option value="">None yet</option>
                    {Object.entries(methodLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                {payMethod && (
                  <div className="grid gap-2">
                    <input name="payAmount" required inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} aria-label="Amount paid, in rupees" placeholder="Amount paid (₹)" className="field" />
                    {quote?.totalPaise != null && !override && (
                      <button type="button" onClick={() => setPayAmount(String(quote.totalPaise! / 100))} className="justify-self-start text-[0.85rem] underline underline-offset-2">
                        The full {rupees(quote.totalPaise)}
                      </button>
                    )}
                    <input name="payReference" aria-label="Reference" placeholder="UPI, card or receipt reference" className="field" />
                  </div>
                )}
                <p className="text-[0.82rem] text-muted">
                  {payMethod ? "The booking is confirmed when paid in full, or part paid." : "Without a payment, the rooms are held for the resort's hold time, then go back on sale."}
                </p>
              </>
            )}
          </section>
        )}

        <div className="grid gap-2">
          <button type="submit" disabled={pending || lines.length === 0} className="button">
            {pending ? "Booking…" : "Create booking"}
          </button>
          <FormNote state={state} />
        </div>
      </div>
    </form>
  );
}

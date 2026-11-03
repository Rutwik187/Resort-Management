"use client";

import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";
import { formatDay, isDate, plural, pluralOf, todayInIndia } from "./dates";
import { PartyPicker } from "./party-picker";
import { describeParty, formatRupees, headcount, priceForPass } from "./pricing";
import { requestMessage, type RequestLine } from "./request";
import { newKey } from "./saved";
import { useSessionValue } from "./store";
import { Tray, TrayDock, useCheckout } from "./tray";
import type { Desk, Party, Pass } from "./types";

type DayPlannerProps = {
  passes: Pass[];
  desk: Desk;
  /** Names this site's saved selection, such as "gc". */
  storageKey: string;
  notes?: string[];
  /** What one pass is called on this site: "day pass" or "day package". */
  noun?: string;
};

type PickedPass = { key: string; passId: string; party: Party };

type DayPlan = { date: string; items: PickedPass[] };

const emptyDay: DayPlan = { date: "", items: [] };

const noop = () => () => {};

/**
 * Day visits, the same way as rooms: choose the date, add a pass and say
 * who is coming, then add other passes. The tray keeps the total.
 */
export function DayPlanner({ passes, desk, storageKey, notes = [], noun = "day pass" }: DayPlannerProps) {
  const byId = new Map(passes.map((pass) => [pass.id, pass]));
  const today = useSyncExternalStore(noop, () => todayInIndia(), () => "");
  const [announcement, setAnnouncement] = useState("");
  const checkout = useCheckout();
  const key = `booking:${storageKey}:day`;
  const [plan, setPlan] = useSessionValue<DayPlan>(key, emptyDay, () => {
    try {
      const raw = JSON.parse(sessionStorage.getItem(key) ?? "null") as Partial<DayPlan> | null;
      return {
        date: isDate(raw?.date) ? raw.date : "",
        items: Array.isArray(raw?.items) ? raw.items.filter((item) => byId.has(item?.passId) && typeof item.key === "string") : [],
      };
    } catch {
      // A broken saved selection is simply ignored.
      return emptyDay;
    }
  });
  const { date, items: picked } = plan;
  const setDate = (next: string) => setPlan({ date: next, items: picked });
  const setPicked = (items: PickedPass[]) => setPlan({ date, items });

  const lines: RequestLine[] = picked.flatMap((item) => {
    const pass = byId.get(item.passId);
    return pass ? [{ key: item.key, title: `${pass.name} ${noun}`, detail: describeParty(item.party), amount: priceForPass(pass, item.party) }] : [];
  });
  const total = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  const people = picked.reduce((sum, item) => sum + headcount(item.party), 0);
  const blocker = picked.length === 0 ? `Add a ${noun} to continue.` : !date ? "Choose your date to continue." : null;

  const tray = (
    <Tray
      heading="Your day"
      when={date ? `${formatDay(date)} · ${plural(people, "guest")}` : <a href="#visit-date" className="underline underline-offset-4">Choose your date</a>}
      lines={lines}
      emptySlots={[]}
      onRemove={(itemKey) => setPicked(picked.filter((item) => item.key !== itemKey))}
      total={total}
      notes={notes}
      blocker={blocker}
      desk={desk}
      checkout={checkout}
      message={(guest) =>
        requestMessage({ desk, opening: `I would like to book ${pluralOf(noun)} for a day visit.`, when: [`Date: ${formatDay(date)}`], lines, total, guest })
      }
    />
  );

  return (
    <div className="pb-28 lg:pb-0">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start xl:gap-12">
        <div>
          <label id="visit-date" className="flex scroll-mt-28 flex-col rounded-bk border border-bk-line bg-bk-card px-5 py-3 text-bk-ink sm:max-w-sm">
            <span className="text-[0.78rem] text-bk-muted">Date of your visit</span>
            <input
              type="date"
              required
              min={today || undefined}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1.5 min-h-8 w-full appearance-none bg-transparent text-[1rem] outline-none [color-scheme:light]"
            />
          </label>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {passes.map((pass) => (
              <PassCard
                key={pass.id}
                pass={pass}
                noun={noun}
                count={picked.filter((item) => item.passId === pass.id).length}
                onAdd={(party) => {
                  setPicked([...picked, { key: newKey(pass.id), passId: pass.id, party }]);
                  setAnnouncement(`${pass.name} ${noun} added for ${describeParty(party)}.`);
                  checkout.setStep("pick");
                }}
              />
            ))}
          </div>
        </div>

        <aside aria-label="Your selection" className="hidden lg:sticky lg:top-[calc(var(--bk-sticky-top)+1rem)] lg:block">
          <div data-lenis-prevent className="max-h-[calc(100svh-var(--bk-sticky-top)-2rem)] overflow-y-auto overscroll-contain rounded-bk border border-bk-line bg-bk-card p-6">
            {tray}
          </div>
        </aside>
      </div>

      <TrayDock summary={picked.length ? `${plural(picked.length, noun)} · ${plural(people, "guest")}` : `No ${pluralOf(noun)} added yet`} total={picked.length ? total : null}>
        {tray}
      </TrayDock>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function PassCard({ pass, noun, count, onAdd }: { pass: Pass; noun: string; count: number; onAdd: (party: Party) => void }) {
  const [picking, setPicking] = useState(false);
  const [party, setParty] = useState<Party>({ adults: 2, children5to11: 0, children3to5: 0, under3: 0 });
  const [added, setAdded] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setPicking(false);
    requestAnimationFrame(() => addRef.current?.focus());
  };

  return (
    <article aria-labelledby={`pass-${pass.id}`} className={`rounded-bk border border-bk-line bg-bk-card p-3 text-bk-ink sm:p-4 ${picking ? "md:col-span-2" : ""}`}>
      {pass.photo && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-[calc(var(--bk-radius)*0.75)] bg-bk-soft">
          <Image src={pass.photo.src} alt={pass.photo.alt} fill sizes="(min-width: 768px) 30vw, 100vw" placeholder="blur" className="object-cover" />
        </div>
      )}
      <div className="px-1 pt-4">
        <h3 id={`pass-${pass.id}`} className="bk-display text-[1.7rem]">
          {pass.name}
        </h3>
        <p className="mt-1 text-[0.95rem] tabular-nums">{pass.hours}</p>
        <p className="mt-1 text-[0.88rem] text-bk-muted">{pass.meals}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-bk-line pt-4 text-[0.82rem] text-bk-muted">
          <div>
            <dt>Adult</dt>
            <dd className="bk-display mt-1 text-[1.35rem] leading-none text-bk-ink tabular-nums">{formatRupees(pass.adult)}</dd>
          </div>
          <div>
            <dt>Child, 5 to 11</dt>
            <dd className="mt-1 text-[1rem] text-bk-ink tabular-nums">{formatRupees(pass.child5to11)}</dd>
          </div>
          <div>
            <dt>Child, 3 to 5</dt>
            <dd className="mt-1 text-[1rem] text-bk-ink tabular-nums">{formatRupees(pass.child3to5)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[0.8rem] text-bk-muted">Per person, plus GST. Under 3 free.</p>
        {!picking && (
          <>
            <button
              ref={addRef}
              type="button"
              onClick={() => {
                setPicking(true);
                setAdded(false);
              }}
              className="mt-4 min-h-12 w-full rounded-bk-control bg-bk-accent px-5 text-[0.95rem] font-medium text-bk-accent-ink transition-opacity hover:opacity-90"
            >
              {count > 0 ? "Add more guests" : `Add ${noun}`}
            </button>
            <p aria-live="polite" className="mt-2 min-h-[1.25rem] text-center text-[0.82rem] text-bk-good">
              {added ? "Added. See it in your selection." : count > 0 ? `${count} in your selection` : ""}
            </p>
          </>
        )}
      </div>
      {picking && (
        <div className="mt-4">
          <PartyPicker
            title={`Who is coming on the ${pass.name.toLowerCase()} ${noun}?`}
            party={party}
            onChange={setParty}
            maxGuests={60}
            price={
              <span>
                <span className="bk-display text-[1.45rem] tabular-nums">{formatRupees(priceForPass(pass, party))}</span>
                <span className="text-bk-muted"> plus GST</span>
              </span>
            }
            confirmLabel={`Add ${noun}`}
            onCancel={close}
            onConfirm={() => {
              onAdd(party);
              setAdded(true);
              close();
            }}
          />
        </div>
      )}
    </article>
  );
}

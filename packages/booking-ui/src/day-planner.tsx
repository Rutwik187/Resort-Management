"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Calendar } from "./calendar";
import { DateField, useToday } from "./date-field";
import { formatDay, isDate, plural, pluralOf } from "./dates";
import { PickDialog } from "./pick-dialog";
import { describeParty, formatRupees, headcount, priceForPass } from "./pricing";
import { requestMessage, type RequestLine } from "./request";
import { dayParam, passParam } from "./params";
import { newKey } from "./saved";
import { Sheet } from "./sheet";
import { Steps } from "./steps";
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

/** The pass in the panel, who comes on it, and, when changing a line already added, that line's key. */
type Picking = { passId: string; party: Party; key?: string };

const emptyDay: DayPlan = { date: "", items: [] };

const startParty: Party = { adults: 2, children5to11: 0, children3to5: 0, under3: 0 };

const noop = () => () => {};

const dateFromAddress = () => {
  const value = new URLSearchParams(window.location.search).get(dayParam);
  return isDate(value) ? value : null;
};

/**
 * Day visits, the same way as rooms: choose the date, add a pass and say
 * who is coming, then add other passes. The tray keeps the total.
 */
export function DayPlanner({ passes, desk, storageKey, notes = [], noun = "day pass" }: DayPlannerProps) {
  const byId = new Map(passes.map((pass) => [pass.id, pass]));
  const today = useToday();
  const [announcement, setAnnouncement] = useState("");
  const checkout = useCheckout();
  const key = `booking:${storageKey}:day`;
  const [plan, setPlan] = useSessionValue<DayPlan>(key, emptyDay, () => {
    // A date chosen a moment ago on the home page wins over a saved one.
    const fromAddress = dateFromAddress();
    try {
      const raw = JSON.parse(sessionStorage.getItem(key) ?? "null") as Partial<DayPlan> | null;
      return {
        date: fromAddress ?? (isDate(raw?.date) ? raw.date : ""),
        items: Array.isArray(raw?.items) ? raw.items.filter((item) => byId.has(item?.passId) && typeof item.key === "string") : [],
      };
    } catch {
      // A broken saved selection is simply ignored.
      return { date: fromAddress ?? "", items: [] };
    }
  });
  const { date, items: picked } = plan;

  // A new date from the home page, after this tab already saved a plan, replaces the saved date.
  useEffect(() => {
    const fromAddress = dateFromAddress();
    if (fromAddress && fromAddress !== plan.date) setPlan({ date: fromAddress, items: plan.items });
    // Only when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setDate = (next: string) => setPlan({ date: next, items: picked });
  const setPicked = (items: PickedPass[]) => setPlan({ date, items });

  // The panels: adding or changing a pass, the phone tray, and the date.
  const [picking, setPicking] = useState<Picking | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickCount, setPickCount] = useState(0);
  const [trayOpen, setTrayOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  // Counts the date panel's openings. Its calendar stays mounted while the panel is closed, so a new key starts it on the visit's own month.
  const [dateOpens, setDateOpens] = useState(0);
  const openDate = () => {
    setDateOpens((n) => n + 1);
    setDateOpen(true);
  };
  const [fresh, setFresh] = useState<string | null>(null);

  // A link can ask for one pass, such as /day-packages?pass=morning. Its panel opens once, until the guest closes it.
  const invited = useSyncExternalStore(noop, () => new URLSearchParams(window.location.search).get(passParam), () => null);
  const [inviteDone, setInviteDone] = useState(false);
  const invitedPass = invited && !inviteDone ? byId.get(invited) : undefined;
  useEffect(() => {
    if (invitedPass) document.getElementById(`pass-${invitedPass.id}`)?.scrollIntoView({ block: "center" });
  }, [invitedPass]);
  const current: Picking | null = invitedPass && !pickOpen ? { passId: invitedPass.id, party: startParty } : picking;
  const currentOpen = pickOpen || Boolean(invitedPass);

  function openPick(next: Picking) {
    setPicking(next);
    setPickCount((n) => n + 1);
    setPickOpen(true);
    setInviteDone(true);
  }

  function closePick() {
    setPickOpen(false);
    setInviteDone(true);
  }

  function confirmPick() {
    const pass = current && byId.get(current.passId);
    if (!current || !pass) return;
    if (current.key) {
      setPicked(picked.map((item) => (item.key === current.key ? { ...item, party: current.party } : item)));
      setAnnouncement(`${pass.name} ${noun} is now for ${describeParty(current.party)}.`);
    } else {
      const itemKey = newKey(pass.id);
      setPicked([...picked, { key: itemKey, passId: pass.id, party: current.party }]);
      setFresh(itemKey);
      setAnnouncement(`${pass.name} ${noun} added for ${describeParty(current.party)}.`);
    }
    checkout.setStep("pick");
    closePick();
  }

  const lines: RequestLine[] = picked.flatMap((item) => {
    const pass = byId.get(item.passId);
    return pass ? [{ key: item.key, title: `${pass.name} ${noun}`, detail: describeParty(item.party), amount: priceForPass(pass, item.party) }] : [];
  });
  const total = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  const people = picked.reduce((sum, item) => sum + headcount(item.party), 0);
  const blocker = picked.length === 0 ? `Add a ${noun} to continue.` : !date ? "Choose your date to continue." : null;

  const when = date ? (
    <>
      {formatDay(date)}
      {people ? ` · ${plural(people, "guest")}` : ""}{" "}
      <button type="button" onClick={openDate} className="ml-1 text-bk-ink underline underline-offset-4">
        Change
      </button>
    </>
  ) : (
    <button type="button" onClick={openDate} className="text-bk-ink underline underline-offset-4">
      Choose your date
    </button>
  );

  const tray = (
    <Tray
      heading="Your day"
      when={when}
      lines={lines}
      emptySlots={[]}
      emptyNote={`Nothing added yet. Choose a ${noun} from the list.`}
      onRemove={(itemKey) => setPicked(picked.filter((item) => item.key !== itemKey))}
      onEdit={(itemKey) => {
        const item = picked.find((p) => p.key === itemKey);
        if (item) openPick({ passId: item.passId, party: item.party, key: item.key });
      }}
      fresh={fresh}
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

  const shownPass = current ? byId.get(current.passId) : undefined;

  return (
    <div className="pb-28 lg:pb-0">
      <Steps
        steps={[
          { label: "Choose the date", done: Boolean(date) },
          { label: `Add ${pluralOf(noun)} and guests`, done: picked.length > 0 },
          { label: "Send the request on WhatsApp", done: checkout.step === "sent" },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start xl:gap-12">
        <div className="min-w-0">
          <div id="visit-date" className="relative z-10 scroll-mt-28 rounded-bk border border-bk-line bg-bk-card text-bk-ink sm:max-w-sm">
            <DateField label="Date of your visit" value={date} min={today || undefined} onChange={setDate} className="rounded-[calc(var(--bk-radius)-1px)]" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {passes.map((pass) => (
              <PassCard
                key={pass.id}
                pass={pass}
                noun={noun}
                count={picked.filter((item) => item.passId === pass.id).length}
                onPick={() => openPick({ passId: pass.id, party: startParty })}
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

      <TrayDock
        summary={`${plural(picked.length, noun)} · ${plural(people, "guest")}`}
        total={`${formatRupees(total)} + GST`}
        visible={picked.length > 0}
        open={trayOpen}
        onOpenChange={setTrayOpen}
      >
        {tray}
      </TrayDock>

      {current && shownPass && (
        <PickDialog
          open={currentOpen}
          onClose={closePick}
          eyebrow={current.key ? `Change who is coming` : `Add a ${noun}`}
          name={shownPass.name}
          photo={shownPass.photo}
          when={<DayDate key={pickCount} date={date} onChange={setDate} />}
          question="Who is coming?"
          party={current.party}
          onParty={(party) => {
            setPicking({ ...current, party });
            setPickOpen(true);
            setInviteDone(true);
          }}
          price={
            <span>
              <span className="bk-display block text-[1.45rem] leading-tight tabular-nums">{formatRupees(priceForPass(shownPass, current.party))}</span>
              <span className="text-[0.82rem] text-bk-muted">plus GST · {shownPass.hours}</span>
            </span>
          }
          confirmLabel={current.key ? "Save" : `Add ${noun}`}
          onConfirm={confirmPick}
        />
      )}

      <Sheet open={dateOpen} onClose={() => setDateOpen(false)} label="Date of your visit" center>
        <h2 data-autofocus tabIndex={-1} className="bk-display pr-10 outline-none text-[1.6rem]">Date of your visit</h2>
        <div className="mt-4">
          <Calendar
            key={dateOpens}
            start={date}
            min={today || undefined}
            onPick={(next) => {
              setDate(next);
              setDateOpen(false);
            }}
          />
        </div>
      </Sheet>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/** The visit's date in the panel: a line with "Change", or the calendar when there is no date yet. */
function DayDate({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const today = useToday();
  const [editing, setEditing] = useState(!date);
  if (!editing && date) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[calc(var(--bk-radius)*0.6)] bg-bk-soft px-4 py-3 text-[0.92rem]">
        <span>{formatDay(date)}</span>
        <button type="button" onClick={() => setEditing(true)} className="min-h-10 shrink-0 text-bk-ink underline underline-offset-4">
          Change
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-bk border border-bk-line px-3 pb-3 pt-2">
      <p className="px-1 pt-1 text-[0.85rem] text-bk-muted">Date of your visit</p>
      <Calendar
        start={date}
        min={today || undefined}
        onPick={(next) => {
          onChange(next);
          setEditing(false);
        }}
      />
    </div>
  );
}

function PassCard({ pass, noun, count, onPick }: { pass: Pass; noun: string; count: number; onPick: () => void }) {
  return (
    <article id={`pass-${pass.id}`} aria-labelledby={`pass-${pass.id}-name`} className="flex flex-col rounded-bk border border-bk-line bg-bk-card p-3 text-bk-ink sm:p-4">
      {pass.photo && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-[calc(var(--bk-radius)*0.75)] bg-bk-soft">
          <Image src={pass.photo.src} alt={pass.photo.alt} fill sizes="(min-width: 768px) 30vw, 100vw" placeholder="blur" className="object-cover" />
        </div>
      )}
      <div className="flex flex-1 flex-col px-1 pt-4">
        <h3 id={`pass-${pass.id}-name`} className="bk-display text-[1.7rem]">
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
        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={onPick}
            className="min-h-12 w-full rounded-bk-control bg-bk-accent px-5 bk-button text-bk-accent-ink transition-opacity hover:opacity-90"
          >
            {count > 0 ? `Add another ${noun}` : `Add ${noun}`}
          </button>
          {count > 0 && (
            <p className="mt-2 text-center text-[0.84rem] text-bk-good">
              <span aria-hidden>✓ </span>
              {count} in your day
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

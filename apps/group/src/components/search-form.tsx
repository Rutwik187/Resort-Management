"use client";

import { useId, useState } from "react";
import { DateInput } from "@repo/booking-ui";

/*
 * The group's search (BW-01 to BW-03): a stay (check-in, check-out, guests)
 * or a day visit (one date, guests), at any resort or one. It sends the
 * guest to the results page, which reads every resort live.
 */

type Props = {
  resorts: { code: string; name: string }[];
  initial?: { kind?: "stay" | "day"; checkIn?: string; checkOut?: string; day?: string; adults?: number; children?: number; resort?: string };
  compact?: boolean;
};

const field = "mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-[0.98rem] text-ink outline-none focus:border-forest";

export function SearchForm({ resorts, initial = {}, compact = false }: Props) {
  const id = useId();
  const [kind, setKind] = useState<"stay" | "day">(initial.kind ?? "stay");
  const [checkIn, setCheckIn] = useState(initial.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial.checkOut ?? "");
  const [day, setDay] = useState(initial.day ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <form
      action="/search"
      method="get"
      onSubmit={(event) => {
        if (kind === "stay" && (!checkIn || !checkOut || checkOut <= checkIn)) {
          event.preventDefault();
          setProblem("Choose a check-in date and a later check-out date.");
        } else if (kind === "day" && !day) {
          event.preventDefault();
          setProblem("Choose the day of your visit.");
        }
      }}
      className={`grid gap-4 rounded-3xl bg-white/95 p-5 text-ink shadow-[0_30px_60px_-30px_rgb(0_0_0/0.45)] ${compact ? "" : "md:p-6"}`}
    >
      <input type="hidden" name="kind" value={kind} />
      <div role="radiogroup" aria-label="What are you planning?" className="flex gap-2">
        {(["stay", "day"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => {
              setKind(value);
              setProblem(null);
            }}
            className={`min-h-10 rounded-full px-4 text-[0.95rem] ${kind === value ? "bg-forest text-white" : "border border-ink/15 text-ink/80"}`}
          >
            {value === "stay" ? "A stay" : "A day visit"}
          </button>
        ))}
      </div>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-6"}`}>
        <label className="text-[0.85rem] text-muted lg:col-span-2">
          Resort
          <select name="resort" defaultValue={initial.resort ?? ""} className={field}>
            <option value="">Any resort</option>
            {resorts.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        {kind === "stay" ? (
          <>
            <div className="text-[0.85rem] text-muted">
              <span>Check-in</span>
              <DateInput id={`${id}-in`} label="Check-in" name="in" value={checkIn} onChange={setCheckIn} className={field} />
            </div>
            <div className="text-[0.85rem] text-muted">
              <span>Check-out</span>
              <DateInput id={`${id}-out`} label="Check-out" name="out" value={checkOut} onChange={setCheckOut} className={field} />
            </div>
          </>
        ) : (
          <div className="text-[0.85rem] text-muted lg:col-span-2">
            <span>Date</span>
            <DateInput id={`${id}-day`} label="Date" name="day" value={day} onChange={setDay} className={field} />
          </div>
        )}
        <label className="text-[0.85rem] text-muted">
          Adults{kind === "stay" ? ", a room" : ""}
          <input name="adults" type="number" min={1} max={kind === "stay" ? 12 : 200} defaultValue={initial.adults ?? 2} className={field} />
        </label>
        <label className="text-[0.85rem] text-muted">
          Children 5 to 11
          <input name="children" type="number" min={0} max={kind === "stay" ? 8 : 200} defaultValue={initial.children ?? 0} className={field} />
        </label>
      </div>
      {problem && (
        <p role="alert" className="text-[0.9rem] text-clay">
          {problem}
        </p>
      )}
      <button type="submit" className="min-h-12 rounded-full bg-forest px-6 font-medium text-white transition-colors hover:bg-forest-soft sm:justify-self-start">
        Search the resorts
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { leadInterestLabel, leadStatusLabel } from "@/lib/format";
import { moveLead } from "./actions";

export type BoardLead = {
  id: string;
  name: string;
  status: keyof typeof leadStatusLabel;
  interest: keyof typeof leadInterestLabel;
  guests: number | null;
  dateFrom: string | null;
  due: boolean;
  followUpOn: string | null;
  estimatedValuePaise: number | null;
  assignedName: string | null;
  assignedImage: string | null;
};

const columns: (keyof typeof leadStatusLabel)[] = ["new", "contacted", "site_visit_scheduled", "site_visit_done", "quoted", "negotiation", "won", "lost"];
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/**
 * The leads board (CRM-01): one column per stage. Drag a card to move the
 * lead. Lost asks for a reason; Booked comes from making the booking, so a
 * card can't be dropped there. Arrow buttons on each card do the same by
 * keyboard.
 */
export function LeadBoard({ leads, base, canMove }: { leads: BoardLead[]; base: string; canMove: boolean }) {
  const [shown, setShown] = useOptimistic(leads, (state, move: { id: string; status: BoardLead["status"] }) => state.map((lead) => (lead.id === move.id ? { ...lead, status: move.status } : lead)));
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();

  function move(lead: BoardLead, status: BoardLead["status"]) {
    if (!canMove || lead.status === status) return;
    if (status === "won") {
      toast.error("A lead is booked by making its booking. Open the lead and use Make a booking.");
      return;
    }
    if (lead.status === "won") {
      toast.error("This lead is booked. Change the booking instead.");
      return;
    }
    let reason: string | undefined;
    if (status === "lost") {
      reason = window.prompt(`Why was ${lead.name}'s lead lost?`, "")?.trim();
      if (!reason || reason.length < 3) return;
    }
    start(async () => {
      setShown({ id: lead.id, status });
      const result = await moveLead(lead.id, status, reason);
      if (result?.error) toast.error(result.error);
      else if (result?.done) toast.success(`${lead.name}: ${result.done.toLowerCase()}`);
    });
  }

  const drop = (status: BoardLead["status"]) => (event: DragEvent) => {
    event.preventDefault();
    setOver(null);
    const lead = shown.find((l) => l.id === event.dataTransfer.getData("text/lead"));
    if (lead) move(lead, status);
  };

  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
      {columns.map((status) => {
        const cards = shown.filter((lead) => lead.status === status);
        const value = cards.reduce((sum, lead) => sum + (lead.estimatedValuePaise ?? 0), 0);
        return (
          <section
            key={status}
            aria-label={leadStatusLabel[status]}
            onDragOver={(event) => {
              if (!canMove) return;
              event.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((current) => (current === status ? null : current))}
            onDrop={drop(status)}
            className={`flex w-64 shrink-0 snap-start flex-col rounded-lg border bg-muted/30 transition-colors ${over === status ? "border-primary bg-primary/5" : ""}`}
          >
            <header className="flex items-baseline justify-between gap-2 border-b px-3 py-2">
              <h3 className="text-sm font-semibold">{leadStatusLabel[status]}</h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {cards.length}
                {value > 0 ? ` · ${rupees(value)}` : ""}
              </span>
            </header>
            <ul className="grid max-h-[65svh] content-start gap-2 overflow-y-auto p-2">
              {cards.length === 0 && <li className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">Nothing here</li>}
              {cards.map((lead) => {
                const at = columns.indexOf(lead.status);
                return (
                  <li
                    key={lead.id}
                    draggable={canMove && lead.status !== "won"}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/lead", lead.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className="group rounded-md border bg-background p-2.5 text-sm shadow-xs data-[drag=true]:opacity-50"
                  >
                    <Link href={`${base}/${lead.id}`} className="font-medium hover:underline">
                      {lead.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {leadInterestLabel[lead.interest]}
                      {lead.guests ? ` · ${lead.guests} guests` : ""}
                      {lead.estimatedValuePaise ? ` · ${rupees(lead.estimatedValuePaise)}` : ""}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {lead.followUpOn ? (
                        <span className={`flex items-center gap-1 text-xs ${lead.due ? "font-medium text-warn" : "text-muted-foreground"}`}>
                          <CalendarClock className="size-3" />
                          {new Date(`${lead.followUpOn}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}
                        </span>
                      ) : (
                        <span />
                      )}
                      {lead.assignedName && <PersonAvatar name={lead.assignedName} image={lead.assignedImage} className="size-5 rounded-full text-[0.6rem]" />}
                    </div>
                    {canMove && lead.status !== "won" && lead.status !== "lost" && (
                      <div className="mt-2 flex justify-between opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <button type="button" disabled={at === 0} onClick={() => move(lead, columns[at - 1])} className="rounded px-1.5 text-xs text-muted-foreground hover:bg-muted disabled:invisible" aria-label={`Move ${lead.name} back to ${leadStatusLabel[columns[Math.max(0, at - 1)]]}`}>
                          ←
                        </button>
                        <button type="button" disabled={at >= 5} onClick={() => move(lead, columns[at + 1])} className="rounded px-1.5 text-xs text-muted-foreground hover:bg-muted disabled:invisible" aria-label={`Move ${lead.name} on to ${leadStatusLabel[columns[Math.min(7, at + 1)]]}`}>
                          →
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

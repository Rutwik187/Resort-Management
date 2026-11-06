"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { DateRangeField } from "@/components/date-field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Choice = { value: string; label: string };

/** A filter as a compact dropdown. Its first choice, "any", leaves the filter off. */
function Choose({ name, label, value, any, choices, onPick }: { name: string; label: string; value?: string; any: string; choices: Choice[]; onPick: () => void }) {
  return (
    <Select name={name} defaultValue={value ?? "all"} onValueChange={onPick}>
      <SelectTrigger aria-label={label} className={cn("w-full sm:w-auto sm:min-w-36", value && "border-primary/40 bg-primary/[0.04] font-medium")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{any}</SelectItem>
        {choices.map((choice) => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * The booking list's search and filters (ADM-03), in one bar. A dropdown or
 * dates apply as soon as they are picked; the search applies on Enter. They
 * go in the address, so a list can be shared or bookmarked.
 */
export function BookingFilters({
  base,
  values,
  statuses,
  sources,
}: {
  base: string;
  values: { q?: string; status?: string; paid?: string; source?: string; arrivingFrom?: string; arrivingTo?: string; bookedFrom?: string; bookedTo?: string };
  statuses: Choice[];
  sources: Choice[];
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  // Only the filters in use go in the address: no empty fields, no "any".
  const apply = () => {
    if (!form.current) return;
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(form.current)) if (typeof value === "string" && value.trim() && value !== "all") query.set(key, value.trim());
    const text = query.toString();
    startTransition(() => router.push(text ? `${base}?${text}` : base));
  };
  // A dropdown's hidden field takes its new value after this render, so apply on the next tick.
  const applySoon = () => setTimeout(apply, 0);

  return (
    <form
      ref={form}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      className="grid gap-2 sm:flex sm:flex-wrap sm:items-center"
    >
      <InputGroup className="sm:max-w-80 sm:min-w-64 sm:flex-1">
        <InputGroupAddon>{pending ? <Spinner /> : <Search />}</InputGroupAddon>
        <InputGroupInput id="q" name="q" type="search" defaultValue={values.q} placeholder="Number, name, phone or email" aria-label="Search bookings" />
      </InputGroup>
      <div className="grid grid-cols-2 gap-2 sm:contents">
        <Choose name="status" label="Status" value={values.status} any="Any status" choices={statuses} onPick={applySoon} />
        <Choose
          name="paid"
          label="Payment"
          value={values.paid}
          any="Any payment"
          onPick={applySoon}
          choices={[
            { value: "unpaid", label: "Nothing paid" },
            { value: "part", label: "Part paid" },
            { value: "full", label: "Fully paid" },
          ]}
        />
        <Choose name="source" label="Source" value={values.source} any="Any source" choices={sources} onPick={applySoon} />
        <DateRangeField
          id="arriving"
          names={["arrivingFrom", "arrivingTo"]}
          defaultValue={[values.arrivingFrom, values.arrivingTo]}
          placeholder="Arriving"
          short
          onChange={applySoon}
          className={cn("sm:w-auto", values.arrivingFrom && "border-primary/40 bg-primary/[0.04] font-medium")}
        />
        <DateRangeField
          id="booked"
          names={["bookedFrom", "bookedTo"]}
          defaultValue={[values.bookedFrom, values.bookedTo]}
          placeholder="Booked on"
          short
          onChange={applySoon}
          className={cn("sm:w-auto", values.bookedFrom && "border-primary/40 bg-primary/[0.04] font-medium")}
        />
      </div>
    </form>
  );
}

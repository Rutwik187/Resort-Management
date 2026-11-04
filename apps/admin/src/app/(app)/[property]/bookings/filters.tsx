"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { DateRangeField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Choice = { value: string; label: string };

function Choose({ id, name, label, value, any, choices }: { id: string; name: string; label: string; value?: string; any: string; choices: Choice[] }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select name={name} defaultValue={value ?? "all"}>
        <SelectTrigger id={id} className="w-full">
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
    </Field>
  );
}

/** The booking list's search and filters (ADM-03). They go in the address, so a list can be shared or bookmarked. */
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
  const filtered = Object.values(values).some(Boolean);
  return (
    <form role="search" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="q">Search</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput id="q" name="q" type="search" defaultValue={values.q} placeholder="Booking number, name, phone or email" />
        </InputGroup>
      </Field>
      <Choose id="status" name="status" label="Status" value={values.status} any="Any status" choices={statuses} />
      <Choose
        id="paid"
        name="paid"
        label="Payment"
        value={values.paid}
        any="Any payment"
        choices={[
          { value: "unpaid", label: "Nothing paid" },
          { value: "part", label: "Part paid" },
          { value: "full", label: "Fully paid" },
        ]}
      />
      <Field className="sm:col-span-2 lg:col-span-1">
        <FieldLabel htmlFor="arriving">Arriving</FieldLabel>
        <DateRangeField id="arriving" names={["arrivingFrom", "arrivingTo"]} defaultValue={[values.arrivingFrom, values.arrivingTo]} placeholder="Any arrival date" />
      </Field>
      <Field className="sm:col-span-2 lg:col-span-1">
        <FieldLabel htmlFor="booked">Booked</FieldLabel>
        <DateRangeField id="booked" names={["bookedFrom", "bookedTo"]} defaultValue={[values.bookedFrom, values.bookedTo]} placeholder="Any booking date" />
      </Field>
      <Choose id="source" name="source" label="Source" value={values.source} any="Any source" choices={sources} />
      <div className="flex items-end gap-2">
        <Button type="submit">Show bookings</Button>
        {filtered && (
          <Button variant="ghost" asChild>
            <Link href={base}>Clear</Link>
          </Button>
        )}
      </div>
    </form>
  );
}

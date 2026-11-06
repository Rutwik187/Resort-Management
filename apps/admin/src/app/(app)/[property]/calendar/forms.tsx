"use client";

import { useState, type ReactNode } from "react";
import { Ban, CalendarCog, IndianRupee, Unlock } from "lucide-react";
import { DateField } from "@/components/date-field";
import { FormNote, useToastAction } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { blockDates, liftBlockAction, setDatePrices, setStayRules } from "./actions";

type RoomType = { id: string; name: string; units: { id: string; name: string }[] };

const reasons = [
  ["maintenance", "Maintenance"],
  ["owner_use", "Owner use"],
  ["ota_allocation", "Given to an OTA"],
  ["wedding_buyout", "Wedding or buyout"],
  ["other", "Other"],
] as const;

/** The first and last night of a change, picked from the calendar. */
function Nights({ prefix, first, names = ["from", "to"] }: { prefix: string; first: string; names?: [string, string] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field>
        <FieldLabel htmlFor={`${prefix}-from`}>First night</FieldLabel>
        <DateField id={`${prefix}-from`} name={names[0]} defaultValue={first} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${prefix}-to`}>Last night</FieldLabel>
        <DateField id={`${prefix}-to`} name={names[1]} defaultValue={first} />
      </Field>
    </div>
  );
}

/** A side panel holding one form, opened from a button in the page header. */
function FormSheet({ trigger, title, description, children }: { trigger: ReactNode; title: string; description: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">{children(() => setOpen(false))}</div>
      </SheetContent>
    </Sheet>
  );
}

/** Blocks a unit, a room type or the whole resort (INV-04, INV-05). */
export function BlockSheet({ propertyId, types, first }: { propertyId: string; types: RoomType[]; first: string }) {
  return (
    <FormSheet
      title="Block rooms"
      description="Take a room, a whole room type or the whole resort off sale for some nights. Nights already held or booked can't be blocked."
      trigger={
        <Button variant="outline">
          <Ban />
          Block rooms
        </Button>
      }
    >
      {(close) => <BlockForm propertyId={propertyId} types={types} first={first} onDone={close} />}
    </FormSheet>
  );
}

function BlockForm({ propertyId, types, first, onDone }: { propertyId: string; types: RoomType[]; first: string; onDone: () => void }) {
  const [state, action, pending] = useToastAction(blockDates.bind(null, propertyId), onDone);
  return (
    <form action={action} className="grid gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="block-scope">What to block</FieldLabel>
          <Select name="scope" required>
            <SelectTrigger id="block-scope" className="w-full">
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resort">The whole resort (a wedding or a buyout)</SelectItem>
              {types.map((type) => (
                <SelectGroup key={type.id}>
                  <SelectLabel>{type.name}</SelectLabel>
                  <SelectItem value={`type:${type.id}`}>Every {type.name}</SelectItem>
                  {type.units.map((unit) => (
                    <SelectItem key={unit.id} value={`unit:${unit.id}`}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Nights prefix="block" first={first} names={["startsOn", "endsOn"]} />
        <Field>
          <FieldLabel htmlFor="block-reason">Why</FieldLabel>
          <Select name="reason" defaultValue="maintenance">
            <SelectTrigger id="block-reason" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reasons.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="block-note">Note</FieldLabel>
          <Input id="block-note" name="note" placeholder="Such as the OTA or the event" />
        </Field>
      </FieldGroup>
      <FormNote state={state} />
      <SheetFooter className="p-0">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          Block
        </Button>
      </SheetFooter>
    </form>
  );
}

/** Stay rules for a run of nights (INV-08). Nothing switched on or filled clears them. */
export function RulesSheet({ propertyId, types, first }: { propertyId: string; types: RoomType[]; first: string }) {
  return (
    <FormSheet
      title="Stay rules"
      description="Stop selling some nights, close them to arrivals, or set the fewest and most nights for stays that start then. Save with nothing on to clear the rules."
      trigger={
        <Button variant="outline">
          <CalendarCog />
          Stay rules
        </Button>
      }
    >
      {(close) => <RulesForm propertyId={propertyId} types={types} first={first} onDone={close} />}
    </FormSheet>
  );
}

function RulesForm({ propertyId, types, first, onDone }: { propertyId: string; types: RoomType[]; first: string; onDone: () => void }) {
  const [state, action, pending] = useToastAction(setStayRules.bind(null, propertyId), onDone);
  return (
    <form action={action} className="grid gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="rules-type">Room type</FieldLabel>
          <Select name="roomType" defaultValue="all">
            <SelectTrigger id="rules-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Every room type</SelectItem>
              {types.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Nights prefix="rules" first={first} />
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="rules-stop">Stop selling these nights</Label>
          <Switch id="rules-stop" name="stopSell" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="rules-cta">No arrivals on these nights</Label>
          <Switch id="rules-cta" name="closedToArrival" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="rules-min">Fewest nights</FieldLabel>
            <Input id="rules-min" name="minNights" type="number" min={1} max={60} />
          </Field>
          <Field>
            <FieldLabel htmlFor="rules-max">Most nights</FieldLabel>
            <Input id="rules-max" name="maxNights" type="number" min={1} max={365} />
          </Field>
        </div>
        <FieldDescription>The fewest and most nights apply to stays that start on a night.</FieldDescription>
      </FieldGroup>
      <FormNote state={state} />
      <SheetFooter className="p-0">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          Save rules
        </Button>
      </SheetFooter>
    </form>
  );
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A room type's price for chosen nights (PR-04). An empty price clears it. */
export function PricesSheet({ propertyId, types, first }: { propertyId: string; types: RoomType[]; first: string }) {
  return (
    <FormSheet
      title="Prices for dates"
      description="Set a room type's price for chosen nights. It takes the place of the base or season price then. Leave the price empty to remove date prices."
      trigger={
        <Button variant="outline">
          <IndianRupee />
          Prices for dates
        </Button>
      }
    >
      {(close) => <PricesForm propertyId={propertyId} types={types} first={first} onDone={close} />}
    </FormSheet>
  );
}

function PricesForm({ propertyId, types, first, onDone }: { propertyId: string; types: RoomType[]; first: string; onDone: () => void }) {
  const [state, action, pending] = useToastAction(setDatePrices.bind(null, propertyId), onDone);
  return (
    <form action={action} className="grid gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="prices-type">Room type</FieldLabel>
          <Select name="roomType" required>
            <SelectTrigger id="prices-type" className="w-full">
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Nights prefix="prices" first={first} />
        <FieldSet>
          <FieldLegend variant="label">Only on</FieldLegend>
          <FieldDescription>Leave all clear for every night.</FieldDescription>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {weekdays.map((day, i) => (
              <div key={day} className="flex items-center gap-2">
                <Checkbox id={`prices-day-${i}`} name="weekdays" value={String(i)} />
                <Label htmlFor={`prices-day-${i}`} className="font-normal">
                  {day}
                </Label>
              </div>
            ))}
          </div>
        </FieldSet>
        <Field>
          <FieldLabel htmlFor="prices-price">Base price a night (₹)</FieldLabel>
          <Input id="prices-price" name="price" inputMode="decimal" placeholder="Leave empty to remove date prices" />
          <FieldDescription>Extra guests and children still pay the room type&apos;s rates, so it needs a base rate on the Prices page.</FieldDescription>
        </Field>
      </FieldGroup>
      <FormNote state={state} />
      <SheetFooter className="p-0">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          Save prices
        </Button>
      </SheetFooter>
    </form>
  );
}

export function LiftBlockButton({ blockId }: { blockId: string }) {
  const [state, action, pending] = useToastAction(liftBlockAction.bind(null, blockId));
  return (
    <form action={action} className="grid gap-1.5">
      <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">
        {pending ? <Spinner /> : <Unlock />}
        Lift the block
      </Button>
      <FormNote state={state} />
    </form>
  );
}

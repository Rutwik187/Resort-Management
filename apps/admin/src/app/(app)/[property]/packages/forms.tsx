"use client";

import { useActionState, useState } from "react";
import { CalendarClock, Clock, Copy, Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { DateField } from "@/components/date-field";
import { FormNote, useFormFeedback } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { addSlot, createOffering, duplicateOffering, setOfferingActive, setSeats, updateOffering, updateSlot } from "./actions";

export type OfferingValues = {
  id: string;
  kind: "day_package" | "activity" | "dining" | "other";
  code: string;
  name: string;
  summary: string | null;
  adultPaise: number;
  soldOn: number[] | null;
  validFrom: string | null;
  validTo: string | null;
  children: Record<string, number>;
};
export type SlotValues = { id: string; label: string; startsAt: string | null; endsAt: string | null; defaultCapacity: number; active: boolean };

const kinds = [
  ["day_package", "Day package"],
  ["activity", "Activity"],
  ["dining", "Meal sitting"],
  ["other", "Other ticket"],
] as const;
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const asRupees = (paise: number | undefined) => (paise === undefined ? "" : String(paise / 100));
const hhmm = (time: string | null) => time?.slice(0, 5) ?? "";

/** Adds a package, activity or sitting with its first slot, or changes one (its code stays). */
export function OfferingDialog({ propertyId, bands, offering }: { propertyId: string; bands: { id: string; label: string }[]; offering?: OfferingValues }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(offering ? updateOffering.bind(null, offering.id) : createOffering.bind(null, propertyId), undefined);
  useFormFeedback(state, () => setOpen(false));
  const key = offering?.id ?? "new";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {offering ? (
          <Button variant="outline" size="sm">
            <Pencil />
            Change
          </Button>
        ) : (
          <Button>
            <Plus />
            Add a package
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{offering ? `Change ${offering.name}` : "Add a package, activity or meal sitting"}</DialogTitle>
            <DialogDescription>Sold by the day and counted in guests. Leave a child price empty when the resort hasn&apos;t published it; guests who need it see &ldquo;rate to confirm&rdquo;.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={`${key}-kind`}>What it is</FieldLabel>
                <Select name="kind" defaultValue={offering?.kind ?? "day_package"}>
                  <SelectTrigger id={`${key}-kind`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kinds.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-name`}>Name</FieldLabel>
                <Input id={`${key}-name`} name="name" required defaultValue={offering?.name} placeholder="Morning picnic" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-code`}>Code</FieldLabel>
                <Input id={`${key}-code`} name="code" required={!offering} readOnly={Boolean(offering)} defaultValue={offering?.code} placeholder="morning-picnic" className={offering ? "text-muted-foreground" : undefined} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${key}-summary`}>What it includes</FieldLabel>
              <Textarea id={`${key}-summary`} name="summary" rows={2} defaultValue={offering?.summary ?? ""} placeholder="Breakfast, lunch, hi-tea, the pool and activities" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={`${key}-adult`}>Adult (₹)</FieldLabel>
                <Input id={`${key}-adult`} name="adult" required inputMode="decimal" defaultValue={asRupees(offering?.adultPaise)} />
              </Field>
              {bands.map((band) => (
                <Field key={band.id}>
                  <FieldLabel htmlFor={`${key}-child-${band.id}`}>Child, {band.label} (₹)</FieldLabel>
                  <Input id={`${key}-child-${band.id}`} name={`child:${band.id}`} inputMode="decimal" defaultValue={asRupees(offering?.children[band.id])} placeholder="Not published" />
                </Field>
              ))}
            </div>
            <FieldSet>
              <FieldLegend variant="label">Sold on</FieldLegend>
              <FieldDescription>None ticked means every day.</FieldDescription>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {weekdays.map((day, i) => (
                  <div key={day} className="flex items-center gap-2">
                    <Checkbox id={`${key}-day-${i}`} name="soldOn" value={String(i)} defaultChecked={offering?.soldOn?.includes(i)} />
                    <Label htmlFor={`${key}-day-${i}`} className="font-normal">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </FieldSet>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${key}-from`}>Sold from (optional)</FieldLabel>
                <DateField id={`${key}-from`} name="validFrom" defaultValue={offering?.validFrom ?? undefined} placeholder="Any day" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-to`}>Sold until (optional)</FieldLabel>
                <DateField id={`${key}-to`} name="validTo" defaultValue={offering?.validTo ?? undefined} placeholder="No end" />
              </Field>
            </div>
            {!offering && (
              <FieldSet className="rounded-lg border p-4">
                <FieldLegend variant="label">Its first time slot</FieldLegend>
                <div className="grid gap-4 sm:grid-cols-4">
                  <Field>
                    <FieldLabel htmlFor="new-slot-label">Slot</FieldLabel>
                    <Input id="new-slot-label" name="slotLabel" defaultValue="All day" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-slot-from">Starts</FieldLabel>
                    <Input id="new-slot-from" name="startsAt" type="time" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-slot-to">Ends</FieldLabel>
                    <Input id="new-slot-to" name="endsAt" type="time" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-slot-seats">Seats a day</FieldLabel>
                    <Input id="new-slot-seats" name="capacity" type="number" min={0} required />
                  </Field>
                </div>
              </FieldSet>
            )}
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {offering ? "Save changes" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Duplicate (PKG-02), and on or off sale (PKG-01). */
export function OfferingButtons({ offeringId, active }: { offeringId: string; active: boolean }) {
  const [busy, setBusy] = useState<"copy" | "sale" | null>(null);
  const run = async (which: "copy" | "sale") => {
    setBusy(which);
    const result = which === "copy" ? await duplicateOffering(offeringId) : await setOfferingActive(offeringId, !active);
    setBusy(null);
    if (result?.error) toast.error(result.error);
    else if (result?.done) toast.success(result.done);
  };
  return (
    <>
      <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run("copy")}>
        {busy === "copy" ? <Spinner /> : <Copy />}
        Duplicate
      </Button>
      <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run("sale")}>
        {busy === "sale" ? <Spinner /> : active ? <EyeOff /> : <Eye />}
        {active ? "Take off sale" : "Put on sale"}
      </Button>
    </>
  );
}

/** One slot's name, times and usual seats; or a new slot. */
function SlotRow({ offeringId, slot }: { offeringId: string; slot?: SlotValues }) {
  const [state, action, pending] = useActionState(slot ? updateSlot.bind(null, slot.id) : addSlot.bind(null, offeringId), undefined);
  useFormFeedback(state);
  const key = slot?.id ?? `${offeringId}-new`;
  return (
    <form action={action} className="grid gap-2">
      <div className="grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_1fr_0.9fr_auto_auto]">
        <Field>
          <FieldLabel htmlFor={`${key}-label`}>Slot</FieldLabel>
          <Input id={`${key}-label`} name="label" required defaultValue={slot?.label} placeholder="Lunch, second sitting" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${key}-from`}>Starts</FieldLabel>
          <Input id={`${key}-from`} name="startsAt" type="time" defaultValue={hhmm(slot?.startsAt ?? null)} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${key}-to`}>Ends</FieldLabel>
          <Input id={`${key}-to`} name="endsAt" type="time" defaultValue={hhmm(slot?.endsAt ?? null)} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${key}-seats`}>Usual seats</FieldLabel>
          <Input id={`${key}-seats`} name="capacity" type="number" min={0} required defaultValue={slot?.defaultCapacity} />
        </Field>
        {slot ? (
          <div className="flex h-9 items-center gap-2">
            <Switch id={`${key}-active`} name="active" defaultChecked={slot.active} />
            <Label htmlFor={`${key}-active`} className="font-normal">
              On sale
            </Label>
          </div>
        ) : (
          <input type="hidden" name="active" value="on" />
        )}
        <Button type="submit" variant={slot ? "outline" : "default"} disabled={pending}>
          {pending ? <Spinner /> : slot ? null : <Plus />}
          {slot ? "Save" : "Add slot"}
        </Button>
      </div>
      <FormNote state={state} />
    </form>
  );
}

/** The package's time slots, such as a second lunch sitting. */
export function SlotsDialog({ offeringId, name, slots }: { offeringId: string; name: string; slots: SlotValues[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock />
          Time slots
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Time slots: {name}</DialogTitle>
          <DialogDescription>Each slot has its usual seats a day. Days set on their own keep their seats.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {slots.map((slot) => (
            <SlotRow key={slot.id} offeringId={offeringId} slot={slot} />
          ))}
          <Separator />
          <p className="text-sm font-medium">Add a slot</p>
          <SlotRow offeringId={offeringId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Seats for one slot on chosen days, such as more for a festival weekend (INV-09). */
export function SeatsDialog({ slotId, label, first }: { slotId: string; label: string; first: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(setSeats.bind(null, slotId), undefined);
  useFormFeedback(state, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <CalendarClock />
          Seats for days
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Seats for chosen days: {label}</DialogTitle>
            <DialogDescription>A day that already has more guests booked keeps its seats.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor={`${slotId}-cap-from`}>First day</FieldLabel>
                <DateField id={`${slotId}-cap-from`} name="from" defaultValue={first} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${slotId}-cap-to`}>Last day</FieldLabel>
                <DateField id={`${slotId}-cap-to`} name="to" defaultValue={first} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${slotId}-cap-seats`}>Seats</FieldLabel>
              <Input id={`${slotId}-cap-seats`} name="seats" type="number" min={0} required />
            </Field>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Set seats
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

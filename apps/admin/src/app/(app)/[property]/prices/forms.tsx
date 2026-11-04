"use client";

import { useActionState, useState } from "react";
import { CalendarPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { DateField } from "@/components/date-field";
import { FormNote, useFormFeedback } from "@/components/form-note";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { mealLabel, nightsLabel } from "@/lib/format";
import { createSeason, deleteSeason, removeRate, saveBand, saveRate, saveWeekendNights } from "./actions";

export type RateValues = {
  roomTypeId: string;
  dayKind: "any" | "weekday" | "weekend";
  basis: "room" | "person";
  basePaise: number;
  extraAdultPaise: number | null;
  extraBedPaise: number | null;
  mealPlan: "EP" | "CP" | "MAP" | "AP";
  children: Record<string, number>;
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const asRupees = (paise: number | null | undefined) => (paise == null ? "" : String(paise / 100));

/** Which nights take the weekend rate (PR-02). The night of a Friday is the night from Friday to Saturday. */
export function WeekendForm({ propertyId, nights }: { propertyId: string; nights: number[] }) {
  const [state, action, pending] = useActionState(saveWeekendNights.bind(null, propertyId), undefined);
  useFormFeedback(state);
  return (
    <form action={action} className="grid gap-4">
      <fieldset className="flex flex-wrap gap-x-5 gap-y-3">
        <legend className="sr-only">Weekend nights</legend>
        {weekdays.map((day, i) => (
          <div key={day} className="flex items-center gap-2">
            <Checkbox id={`weekend-${i}`} name="nights" value={String(i)} defaultChecked={nights.includes(i)} />
            <Label htmlFor={`weekend-${i}`} className="font-normal">
              {day}
            </Label>
          </div>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending && <Spinner />}
          Save weekend nights
        </Button>
        <FormNote state={state} />
      </div>
    </form>
  );
}

/**
 * Sets one rate: a room type's price for weekday, weekend or every night,
 * as its base rate or a season's. Choosing a room type and nights fills in
 * the rate already saved for them.
 */
export function RateDialog({
  propertyId,
  roomTypes,
  seasonId,
  bands,
  existing,
  trigger,
  title,
}: {
  propertyId: string;
  roomTypes: { id: string; name: string }[];
  seasonId?: string;
  bands: { id: string; label: string }[];
  existing: RateValues[];
  trigger: "add" | "change" | "season";
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveRate.bind(null, propertyId), undefined);
  useFormFeedback(state, () => setOpen(false));
  const [roomTypeId, setRoomTypeId] = useState(roomTypes.length === 1 ? roomTypes[0].id : "");
  const [dayKind, setDayKind] = useState<RateValues["dayKind"]>("weekday");
  const current = existing.find((r) => r.roomTypeId === roomTypeId && r.dayKind === dayKind);
  const prefix = `${seasonId ?? "base"}-${roomTypes.length === 1 ? roomTypes[0].id : "any"}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={trigger === "add" ? "default" : "outline"} size="sm">
          {trigger === "change" ? <Pencil /> : <Plus />}
          {trigger === "change" ? "Change or add a rate" : trigger === "season" ? "Set a season rate" : "Add a rate"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Leave a price empty when the resort hasn&apos;t published it. Guests who need it see &ldquo;rate to confirm&rdquo;, never a guess.</DialogDescription>
          </DialogHeader>
          {seasonId && <input type="hidden" name="seasonId" value={seasonId} />}
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              {roomTypes.length === 1 ? (
                <input type="hidden" name="roomTypeId" value={roomTypes[0].id} />
              ) : (
                <Field>
                  <FieldLabel htmlFor={`${prefix}-type`}>Room type</FieldLabel>
                  <input type="hidden" name="roomTypeId" value={roomTypeId} />
                  <Select value={roomTypeId} onValueChange={setRoomTypeId}>
                    <SelectTrigger id={`${prefix}-type`} className="w-full">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor={`${prefix}-nights`}>Nights</FieldLabel>
                <input type="hidden" name="dayKind" value={dayKind} />
                <Select value={dayKind} onValueChange={(value) => setDayKind(value as RateValues["dayKind"])}>
                  <SelectTrigger id={`${prefix}-nights`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(nightsLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {/* Remounted for each room type and nights, so the fields show what is saved for them. */}
            <div key={`${roomTypeId}-${dayKind}`} className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${prefix}-basis`}>Price is for</FieldLabel>
                <Select name="basis" defaultValue={current?.basis ?? "room"}>
                  <SelectTrigger id={`${prefix}-basis`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">A room</SelectItem>
                    <SelectItem value="person">Each adult</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${prefix}-base`}>Price a night (₹)</FieldLabel>
                <Input id={`${prefix}-base`} name="base" required inputMode="decimal" defaultValue={asRupees(current?.basePaise)} />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor={`${prefix}-meals`}>Meals</FieldLabel>
                <Select name="mealPlan" defaultValue={current?.mealPlan ?? "CP"}>
                  <SelectTrigger id={`${prefix}-meals`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(mealLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${prefix}-extra-adult`}>Each extra adult (₹)</FieldLabel>
                <Input id={`${prefix}-extra-adult`} name="extraAdult" inputMode="decimal" defaultValue={asRupees(current?.extraAdultPaise)} placeholder="Not published" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${prefix}-extra-bed`}>Each extra bed (₹)</FieldLabel>
                <Input id={`${prefix}-extra-bed`} name="extraBed" inputMode="decimal" defaultValue={asRupees(current?.extraBedPaise)} placeholder="Not published" />
              </Field>
              {bands.map((band) => (
                <Field key={band.id}>
                  <FieldLabel htmlFor={`${prefix}-child-${band.id}`}>Child, {band.label} (₹)</FieldLabel>
                  <Input id={`${prefix}-child-${band.id}`} name={`child:${band.id}`} inputMode="decimal" defaultValue={asRupees(current?.children[band.id])} placeholder="Not published" />
                </Field>
              ))}
            </div>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {current ? "Save changes" : "Add rate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A removal that asks once more before it happens. */
function ConfirmRemove({ label, title, description, run }: { label: string; title: string; description: string; run: () => Promise<{ error?: string; done?: string } | undefined> }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(run, undefined);
  useFormFeedback(state, () => setOpen(false));
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <FormNote state={state} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Keep it</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Spinner />}
              Yes, remove
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RemoveRateButton({ rateId }: { rateId: string }) {
  return <ConfirmRemove label="Remove" title="Remove this rate?" description="Nights it priced then take the next rate that applies, or show “rate to confirm”." run={removeRate.bind(null, rateId)} />;
}

export function DeleteSeasonButton({ seasonId, name }: { seasonId: string; name: string }) {
  return <ConfirmRemove label="Remove season" title={`Remove ${name} and its rates?`} description="Its nights go back to the usual rates." run={deleteSeason.bind(null, seasonId)} />;
}

/** A named run of nights with its own rates (PR-03). */
export function SeasonDialog({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createSeason.bind(null, propertyId), undefined);
  useFormFeedback(state, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarPlus />
          Add a season
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add a season</DialogTitle>
            <DialogDescription>Such as Diwali, or Christmas and New Year. Where seasons overlap, the higher priority wins. Give it rates once it&apos;s added.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="season-name">Season</FieldLabel>
              <Input id="season-name" name="name" required placeholder="Diwali" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="season-from">First night</FieldLabel>
                <DateField id="season-from" name="startsOn" />
              </Field>
              <Field>
                <FieldLabel htmlFor="season-to">Last night</FieldLabel>
                <DateField id="season-to" name="endsOn" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="season-priority">Priority</FieldLabel>
              <Input id="season-priority" name="priority" type="number" min={0} max={100} defaultValue={0} />
              <FieldDescription>Higher wins where seasons overlap.</FieldDescription>
            </Field>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Add season
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Band = { id: string; code: string; label: string; minAge: number; maxAge: number; free: boolean };

/** Adds a child age band, or changes one (its code stays). */
export function BandForm({ propertyId, band }: { propertyId: string; band?: Band }) {
  const [state, action, pending] = useActionState(saveBand.bind(null, propertyId, band?.id ?? null), undefined);
  useFormFeedback(state);
  const key = band?.id ?? "new";
  return (
    <form action={action} className="grid gap-2">
      <div className="grid items-end gap-3 sm:grid-cols-[1.3fr_1.1fr_0.6fr_0.6fr_auto_auto]">
        <Field>
          <FieldLabel htmlFor={`${key}-label`}>Band</FieldLabel>
          <Input id={`${key}-label`} name="label" required defaultValue={band?.label} placeholder="5 to 11" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${key}-code`}>Code</FieldLabel>
          <Input id={`${key}-code`} name="code" required readOnly={Boolean(band)} defaultValue={band?.code} placeholder="child_5_11" className={band ? "text-muted-foreground" : undefined} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${key}-min`}>From age</FieldLabel>
          <Input id={`${key}-min`} name="minAge" type="number" min={0} max={17} required defaultValue={band?.minAge} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${key}-max`}>To age</FieldLabel>
          <Input id={`${key}-max`} name="maxAge" type="number" min={0} max={17} required defaultValue={band?.maxAge} />
        </Field>
        <div className="flex h-9 items-center gap-2">
          <Checkbox id={`${key}-free`} name="free" defaultChecked={band?.free} />
          <Label htmlFor={`${key}-free`} className="font-normal">
            Free
          </Label>
        </div>
        <Button type="submit" variant={band ? "outline" : "default"} disabled={pending}>
          {pending && <Spinner />}
          {band ? "Save" : "Add band"}
        </Button>
      </div>
      <FormNote state={state} />
    </form>
  );
}

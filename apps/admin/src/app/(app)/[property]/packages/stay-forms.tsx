"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { DateField } from "@/components/date-field";
import { FormNote, useToastAction } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { mealPlanLabel, packageKindLabel } from "@/lib/format";
import { duplicateStayPackage, saveStayPackage, setStayPackageActive } from "./stay-actions";

export type StayPackageValues = {
  id: string;
  kind: "stay" | "staycation" | "custom";
  code: string;
  name: string;
  summary: string | null;
  inclusions: string[];
  exclusions: string[];
  mealPlan: "EP" | "CP" | "MAP" | "AP";
  roomTypeIds: string[];
  nights: number | null;
  minNights: number | null;
  maxNights: number | null;
  basis: "person" | "couple" | "room";
  priceUnit: "stay" | "night";
  pricePaise: number;
  extraAdultPaise: number | null;
  arrivalDays: number[] | null;
  validFrom: string | null;
  validTo: string | null;
  blackoutDates: string[];
  capacityPerDay: number | null;
  cancellationNote: string | null;
  featured: boolean;
  onWebsite: boolean;
  children: Record<string, number>;
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const asRupees = (paise: number | null | undefined) => (paise === null || paise === undefined ? "" : String(paise / 100));

type Choices = { rooms: { id: string; name: string }[]; bands: { id: string; label: string }[] };

/** Adds a stay, staycation or custom package, or changes one (its code stays). */
export function StayPackageDialog({ propertyId, choices, value }: { propertyId: string; choices: Choices; value?: StayPackageValues }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(saveStayPackage.bind(null, propertyId, value?.id ?? null), () => setOpen(false));
  const [basis, setBasis] = useState(value?.basis ?? "couple");
  const [unit, setUnit] = useState(value?.priceUnit ?? "stay");
  const [fixed, setFixed] = useState(value ? value.nights !== null : true);
  const key = value?.id ?? "new-stay";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {value ? (
          <Button variant="outline" size="sm">
            <Pencil />
            Change
          </Button>
        ) : (
          <Button variant="outline" disabled={choices.rooms.length === 0}>
            <Plus />
            Add a stay package
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{value ? `Change ${value.name}` : "Add a stay package"}</DialogTitle>
            <DialogDescription>A room with inclusions at one price. It uses the rooms of the room types you tick, so it never oversells. Photos and long text stay on the website.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={`${key}-kind`}>Kind</FieldLabel>
                <Select name="kind" defaultValue={value?.kind ?? "stay"}>
                  <SelectTrigger id={`${key}-kind`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(packageKindLabel).map(([v, label]) => (
                      <SelectItem key={v} value={v}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-name`}>Name</FieldLabel>
                <Input id={`${key}-name`} name="name" required minLength={3} maxLength={80} defaultValue={value?.name} placeholder="Weekend escape" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-code`}>Code</FieldLabel>
                <Input id={`${key}-code`} name="code" required={!value} readOnly={Boolean(value)} defaultValue={value?.code} placeholder="weekend-escape" className={value ? "text-muted-foreground" : undefined} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${key}-summary`}>One line for the website</FieldLabel>
              <Input id={`${key}-summary`} name="summary" maxLength={300} defaultValue={value?.summary ?? ""} placeholder="Two nights by the river with every meal and the activities" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${key}-in`}>Includes, one a line</FieldLabel>
                <Textarea id={`${key}-in`} name="inclusions" rows={4} defaultValue={value?.inclusions.join("\n")} placeholder={"All meals\nPool and activities\nBonfire evening"} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-ex`}>Not included, one a line</FieldLabel>
                <Textarea id={`${key}-ex`} name="exclusions" rows={4} defaultValue={value?.exclusions.join("\n")} placeholder={"Adventure activities\nTransport"} />
              </Field>
            </div>
            <FieldSet>
              <FieldLegend variant="label">Room types it can be booked in</FieldLegend>
              <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                {choices.rooms.map((room) => (
                  <div key={room.id} className="flex items-center gap-2">
                    <Checkbox id={`${key}-room-${room.id}`} name="roomTypeIds" value={room.id} defaultChecked={value?.roomTypeIds.includes(room.id)} />
                    <Label htmlFor={`${key}-room-${room.id}`} className="font-normal">
                      {room.name}
                    </Label>
                  </div>
                ))}
              </div>
            </FieldSet>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={`${key}-meals`}>Meal plan</FieldLabel>
                <Select name="mealPlan" defaultValue={value?.mealPlan ?? "AP"}>
                  <SelectTrigger id={`${key}-meals`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(mealPlanLabel).map(([v, label]) => (
                      <SelectItem key={v} value={v}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-end gap-3 pb-2 sm:col-span-2">
                <Switch id={`${key}-fixed`} checked={fixed} onCheckedChange={setFixed} />
                <Label htmlFor={`${key}-fixed`} className="font-normal">
                  A fixed number of nights, such as 1 night and 2 days
                </Label>
              </div>
            </div>
            {fixed ? (
              <Field className="sm:max-w-48">
                <FieldLabel htmlFor={`${key}-nights`}>Nights</FieldLabel>
                <Input id={`${key}-nights`} name="nights" type="number" min={1} max={30} required defaultValue={value?.nights ?? 1} />
              </Field>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${key}-min`}>Fewest nights</FieldLabel>
                  <Input id={`${key}-min`} name="minNights" type="number" min={1} max={30} defaultValue={value?.minNights ?? ""} placeholder="Any" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${key}-max`}>Most nights</FieldLabel>
                  <Input id={`${key}-max`} name="maxNights" type="number" min={1} max={60} defaultValue={value?.maxNights ?? ""} placeholder="Any" />
                </Field>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={`${key}-basis`}>Price is</FieldLabel>
                <Select name="basis" value={basis} onValueChange={(v) => setBasis(v as typeof basis)}>
                  <SelectTrigger id={`${key}-basis`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="couple">Per couple</SelectItem>
                    <SelectItem value="person">Per adult</SelectItem>
                    <SelectItem value="room">Per room</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-unit`}>For</FieldLabel>
                <Select name="priceUnit" value={unit} onValueChange={(v) => setUnit(v as typeof unit)}>
                  <SelectTrigger id={`${key}-unit`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stay">The whole stay</SelectItem>
                    <SelectItem value="night">Each night</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-price`}>Price (₹, before GST)</FieldLabel>
                <Input id={`${key}-price`} name="price" required inputMode="decimal" defaultValue={asRupees(value?.pricePaise)} />
              </Field>
            </div>
            {unit === "stay" && !fixed && <FieldDescription className="text-destructive">A price for the whole stay needs a fixed number of nights.</FieldDescription>}
            <div className="grid gap-4 sm:grid-cols-3">
              {basis !== "person" && (
                <Field>
                  <FieldLabel htmlFor={`${key}-extra`}>Each extra adult (₹)</FieldLabel>
                  <Input id={`${key}-extra`} name="extraAdult" inputMode="decimal" defaultValue={asRupees(value?.extraAdultPaise)} placeholder="Not published" />
                </Field>
              )}
              {choices.bands.map((band) => (
                <Field key={band.id}>
                  <FieldLabel htmlFor={`${key}-child-${band.id}`}>Child, {band.label} (₹)</FieldLabel>
                  <Input id={`${key}-child-${band.id}`} name={`child:${band.id}`} inputMode="decimal" defaultValue={asRupees(value?.children[band.id])} placeholder="Not published" />
                </Field>
              ))}
            </div>
            <FieldSet>
              <FieldLegend variant="label">Arrival days</FieldLegend>
              <FieldDescription>None ticked means any day, such as Fri and Sat for a weekend staycation.</FieldDescription>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {weekdays.map((day, i) => (
                  <div key={day} className="flex items-center gap-2">
                    <Checkbox id={`${key}-arrive-${i}`} name="arrivalDays" value={String(i)} defaultChecked={value?.arrivalDays?.includes(i)} />
                    <Label htmlFor={`${key}-arrive-${i}`} className="font-normal">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </FieldSet>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={`${key}-from`}>First arrival</FieldLabel>
                <DateField id={`${key}-from`} name="validFrom" defaultValue={value?.validFrom ?? undefined} placeholder="Any day" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-to`}>Last arrival</FieldLabel>
                <DateField id={`${key}-to`} name="validTo" defaultValue={value?.validTo ?? undefined} placeholder="No end" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-cap`}>Packages a day</FieldLabel>
                <Input id={`${key}-cap`} name="capacityPerDay" type="number" min={1} defaultValue={value?.capacityPerDay ?? ""} placeholder="Rooms only" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${key}-blackout`}>Blackout arrival dates</FieldLabel>
              <Input id={`${key}-blackout`} name="blackoutDates" defaultValue={value?.blackoutDates.join(", ")} placeholder="2026-12-24, 2026-12-31" />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${key}-cancel`}>Cancellation note</FieldLabel>
              <Input id={`${key}-cancel`} name="cancellationNote" maxLength={500} defaultValue={value?.cancellationNote ?? ""} placeholder="The resort's cancellation policy applies." />
            </Field>
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`${key}-web`} className="font-normal">
                  Show it on the website
                </Label>
                <Switch id={`${key}-web`} name="onWebsite" defaultChecked={value?.onWebsite ?? true} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`${key}-featured`} className="font-normal">
                  Featured: list it first
                </Label>
                <Switch id={`${key}-featured`} name="featured" defaultChecked={value?.featured ?? false} />
              </div>
            </div>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {value ? "Save changes" : "Add package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Duplicate (PKG-02), and on or off sale (PKG-01). */
export function StayPackageButtons({ packageId, active }: { packageId: string; active: boolean }) {
  const [busy, setBusy] = useState<"copy" | "sale" | null>(null);
  const run = async (which: "copy" | "sale") => {
    setBusy(which);
    const result = which === "copy" ? await duplicateStayPackage(packageId) : await setStayPackageActive(packageId, !active);
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

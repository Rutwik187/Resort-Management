"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { FormNote, useToastAction } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createAddon, setAddonActive, updateAddon } from "./addon-actions";

export type AddonValues = {
  id: string;
  code: string;
  name: string;
  summary: string | null;
  basis: "unit" | "person" | "night";
  soldWith: "stay" | "day" | "both";
  pricePaise: number;
  maxQuantity: number;
  onWebsite: boolean;
};

const bases = [
  ["unit", "Per unit", "Once for each one, such as a decoration or a cake."],
  ["person", "Per person", "For each guest who has it, such as a barbecue dinner."],
  ["night", "Per night", "For each one, every night of the stay, such as an extra mattress."],
] as const;
const soldWith = [
  ["both", "Stays and day visits"],
  ["stay", "Stays only"],
  ["day", "Day visits only"],
] as const;

/** Adds an add-on, or changes one (its code stays). */
export function AddonDialog({ propertyId, addon }: { propertyId: string; addon?: AddonValues }) {
  const [open, setOpen] = useState(false);
  const [basis, setBasis] = useState<AddonValues["basis"]>(addon?.basis ?? "unit");
  const [state, action, pending] = useToastAction(addon ? updateAddon.bind(null, addon.id) : createAddon.bind(null, propertyId), () => setOpen(false));
  const key = addon?.id ?? "new-addon";
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Each opening starts from the add-on's own basis, not the last one chosen.
        if (next) setBasis(addon?.basis ?? "unit");
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {addon ? (
          <Button variant="outline" size="sm">
            <Pencil />
            Change
          </Button>
        ) : (
          <Button variant="outline">
            <Plus />
            Add an add-on
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{addon ? `Change ${addon.name}` : "Add an add-on"}</DialogTitle>
            <DialogDescription>Something extra a guest adds to a booking. The price is before GST; GST comes from the resort&apos;s add-on rule in Settings.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${key}-name`}>Name</FieldLabel>
                <Input id={`${key}-name`} name="name" required defaultValue={addon?.name} placeholder="Barbecue dinner" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-code`}>Code</FieldLabel>
                <Input id={`${key}-code`} name="code" required={!addon} readOnly={Boolean(addon)} defaultValue={addon?.code} placeholder="bbq-dinner" className={addon ? "text-muted-foreground" : undefined} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${key}-summary`}>What it includes (optional)</FieldLabel>
              <Textarea id={`${key}-summary`} name="summary" rows={2} defaultValue={addon?.summary ?? ""} placeholder="Grilled vegetables, paneer and chicken by the lawn, from 8 pm" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${key}-basis`}>Priced</FieldLabel>
                <Select name="basis" value={basis} onValueChange={(v) => setBasis(v as AddonValues["basis"])}>
                  <SelectTrigger id={`${key}-basis`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bases.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>{bases.find(([value]) => value === basis)?.[2]}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-price`}>Price (₹, before GST)</FieldLabel>
                <Input id={`${key}-price`} name="price" required inputMode="decimal" defaultValue={addon ? String(addon.pricePaise / 100) : ""} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${key}-with`}>Sold with</FieldLabel>
                <Select key={basis} name="soldWith" defaultValue={basis === "night" ? "stay" : (addon?.soldWith ?? "both")} disabled={basis === "night"}>
                  <SelectTrigger id={`${key}-with`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {soldWith.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {basis === "night" && <input type="hidden" name="soldWith" value="stay" />}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${key}-max`}>Most in one booking</FieldLabel>
                <Input id={`${key}-max`} name="maxQuantity" type="number" min={1} max={100} required defaultValue={addon?.maxQuantity ?? 10} />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Switch id={`${key}-web`} name="onWebsite" defaultChecked={addon?.onWebsite ?? true} />
              <Label htmlFor={`${key}-web`} className="font-normal">
                Guests can add it on the website
              </Label>
            </div>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {addon ? "Save changes" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddonSaleButton({ addonId, active }: { addonId: string; active: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await setAddonActive(addonId, !active);
        setBusy(false);
        if (result?.error) toast.error(result.error);
        else if (result?.done) toast.success(result.done);
      }}
    >
      {busy ? <Spinner /> : active ? <EyeOff /> : <Eye />}
      {active ? "Take off sale" : "Put on sale"}
    </Button>
  );
}

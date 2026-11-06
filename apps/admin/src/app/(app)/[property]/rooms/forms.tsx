"use client";

import { useState } from "react";
import { Globe, Pencil, Plus } from "lucide-react";
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
import { addUnits, createRoomType, editRoomType } from "./actions";

type RoomTypeValues = {
  id: string;
  name: string;
  category: string;
  baseOccupancy: number;
  minGuests: number;
  maxAdults: number | null;
  maxChildren: number;
  maxGuests: number | null;
  extraBedAllowed: boolean;
  bedType: string | null;
  sizeSqft: number | null;
  tagline: string | null;
  description: string | null;
  features: string[];
  webGroup: string | null;
  onWebsite: boolean;
};

/** A section of the resort website's Stays page, such as "Rooms" or "Villas". */
export type StaySection = { id: string; title: string };

const kinds = [
  ["room", "Room"],
  ["cottage", "Cottage"],
  ["villa", "Villa"],
  ["tent", "Tent"],
  ["dormitory", "Dormitory"],
  ["other", "Package or other"],
] as const;

/**
 * The fields of a room type (RM-01): what it is and who it takes, then how
 * the resort's website shows it. The code is set once: it links the type's
 * photos on the website.
 */
function RoomTypeFields({ prefix, type, sections }: { prefix: string; type?: RoomTypeValues; sections: StaySection[] }) {
  const id = (name: string) => `${prefix}-${name}`;
  const numbers = [
    ["baseOccupancy", "Guests in the base price", type?.baseOccupancy ?? 2, true],
    ["minGuests", "Fewest guests", type?.minGuests ?? 1, true],
    ["maxChildren", "Most children", type?.maxChildren ?? 2, true],
    ["maxAdults", "Most adults", type ? (type.maxAdults ?? "") : 3, false],
    ["maxGuests", "Most guests", type ? (type.maxGuests ?? "") : 4, false],
  ] as const;
  return (
    <div className="grid gap-6">
      <FieldSet>
        <FieldLegend>The room type</FieldLegend>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={id("name")}>Name</FieldLabel>
              <Input id={id("name")} name="name" required defaultValue={type?.name} placeholder="Garden View Cottage" />
            </Field>
            {!type && (
              <Field>
                <FieldLabel htmlFor={id("code")}>Code</FieldLabel>
                <Input id={id("code")} name="code" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="garden-view-cottage" />
                <FieldDescription>Small letters, numbers and dashes. It can&apos;t change later.</FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor={id("category")}>Kind</FieldLabel>
              <Select name="category" defaultValue={type?.category ?? "room"}>
                <SelectTrigger id={id("category")} className="w-full">
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
              <FieldLabel htmlFor={id("bedType")}>Bed</FieldLabel>
              <Input id={id("bedType")} name="bedType" defaultValue={type?.bedType ?? ""} placeholder="King bed" />
            </Field>
            <Field>
              <FieldLabel htmlFor={id("sizeSqft")}>Size (sq ft)</FieldLabel>
              <Input id={id("sizeSqft")} name="sizeSqft" type="number" min={1} defaultValue={type?.sizeSqft ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {numbers.map(([name, label, value, required]) => (
              <Field key={name}>
                <FieldLabel htmlFor={id(name)}>{label}</FieldLabel>
                <Input id={id(name)} name={name} type="number" min={0} required={required} defaultValue={value} placeholder={required ? undefined : "No limit"} />
              </Field>
            ))}
          </div>
          <FieldDescription>Leave the most adults or guests empty when the resort sets no limit.</FieldDescription>
          <div className="flex items-center gap-2">
            <Checkbox id={id("extraBed")} name="extraBedAllowed" defaultChecked={type?.extraBedAllowed} />
            <Label htmlFor={id("extraBed")} className="font-normal">
              Extra bed allowed
            </Label>
          </div>
        </FieldGroup>
      </FieldSet>

      <FieldSet className="rounded-lg border bg-muted/30 p-4">
        <FieldLegend className="flex items-center gap-2">
          <Globe className="size-4 text-primary" />
          On the website
        </FieldLegend>
        <FieldGroup className="gap-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={id("onWebsite")} className="font-normal">
              Show it on the resort&apos;s website
            </Label>
            <Switch id={id("onWebsite")} name="onWebsite" defaultChecked={type?.onWebsite ?? true} />
          </div>
          {sections.length > 0 && (
            <Field>
              <FieldLabel htmlFor={id("webGroup")}>Section of the Stays page</FieldLabel>
              <Select name="webGroup" defaultValue={type?.webGroup ?? sections[0].id}>
                <SelectTrigger id={id("webGroup")} className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor={id("tagline")}>Tagline</FieldLabel>
            <Input id={id("tagline")} name="tagline" maxLength={140} defaultValue={type?.tagline ?? ""} placeholder="Glass rooms on stilts, up in the river trees." className="bg-background" />
            <FieldDescription>One line under the name.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={id("description")}>Description</FieldLabel>
            <Textarea id={id("description")} name="description" rows={4} maxLength={2000} defaultValue={type?.description ?? ""} className="bg-background" />
            <FieldDescription>Shown under &ldquo;Details&rdquo;.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={id("features")}>Features</FieldLabel>
            <Textarea id={id("features")} name="features" rows={4} defaultValue={type?.features.join("\n") ?? ""} placeholder={"Balcony jacuzzi\nAir conditioning\nRiver view"} className="bg-background" />
            <FieldDescription>One a line. Short ones, such as &ldquo;Balcony jacuzzi&rdquo;, also show on the card.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}

/** Adds a room type: what it is, how many guests it takes, and how the website shows it (RM-01). */
export function RoomTypeForm({ propertyId, sections }: { propertyId: string; sections: StaySection[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(createRoomType.bind(null, propertyId), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add a room type
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add a room type</DialogTitle>
            <DialogDescription>A kind of room, such as Garden View Cottage. Add its units, the rooms themselves, next.</DialogDescription>
          </DialogHeader>
          <RoomTypeFields prefix="new-type" sections={sections} />
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Add room type
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Changes a room type and its website text (RM-01). Its code stays, because it links the type's photos. */
export function RoomTypeEditForm({ type, sections }: { type: RoomTypeValues; sections: StaySection[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(editRoomType.bind(null, type.id), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Change
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Change {type.name}</DialogTitle>
            <DialogDescription>Its code stays the same, because it links the room type&apos;s photos on the website.</DialogDescription>
          </DialogHeader>
          <RoomTypeFields prefix={type.id} type={type} sections={sections} />
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Adds units: one by name, or a numbered run such as Cottage 1 to 12 (RM-02). */
export function AddUnitsForm({ roomTypeId, typeName, suggestion }: { roomTypeId: string; typeName: string; suggestion: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(addUnits.bind(null, roomTypeId), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          Add units
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add units to {typeName}</DialogTitle>
            <DialogDescription>One unit by its name, or a numbered run such as Cottage 1 to Cottage 12.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={`${roomTypeId}-prefix`}>Unit name</FieldLabel>
              <Input id={`${roomTypeId}-prefix`} name="prefix" required defaultValue={suggestion} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor={`${roomTypeId}-from`}>From number</FieldLabel>
                <Input id={`${roomTypeId}-from`} name="from" type="number" min={0} placeholder="1" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${roomTypeId}-to`}>To number</FieldLabel>
                <Input id={`${roomTypeId}-to`} name="to" type="number" min={0} placeholder="12" />
              </Field>
            </div>
            <FieldDescription>Leave the numbers empty to add one unit with this exact name.</FieldDescription>
            <Field>
              <FieldLabel htmlFor={`${roomTypeId}-block`}>Block or floor</FieldLabel>
              <Input id={`${roomTypeId}-block`} name="block" placeholder="Such as River side" />
            </Field>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Add units
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

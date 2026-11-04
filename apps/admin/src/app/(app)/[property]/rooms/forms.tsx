"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { FormNote, useFormFeedback } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { addUnits, createRoomType, editRoomType } from "./actions";

type RoomTypeValues = {
  id: string;
  name: string;
  category: string;
  baseOccupancy: number;
  minGuests: number;
  maxAdults: number;
  maxChildren: number;
  maxGuests: number;
  extraBedAllowed: boolean;
  bedType: string | null;
  sizeSqft: number | null;
};

const kinds = [
  ["room", "Room"],
  ["cottage", "Cottage"],
  ["villa", "Villa"],
  ["tent", "Tent"],
  ["dormitory", "Dormitory"],
  ["other", "Other"],
] as const;

/** The fields of a room type (RM-01). The code is set once: it links the type's photos and text. */
function RoomTypeFields({ prefix, type }: { prefix: string; type?: RoomTypeValues }) {
  const id = (name: string) => `${prefix}-${name}`;
  const numbers = [
    ["baseOccupancy", "Guests in the base price", type?.baseOccupancy ?? 2],
    ["minGuests", "Fewest guests", type?.minGuests ?? 1],
    ["maxAdults", "Most adults", type?.maxAdults ?? 3],
    ["maxChildren", "Most children", type?.maxChildren ?? 2],
    ["maxGuests", "Most guests", type?.maxGuests ?? 4],
  ] as const;
  return (
    <FieldGroup>
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
        {numbers.map(([name, label, value]) => (
          <Field key={name}>
            <FieldLabel htmlFor={id(name)}>{label}</FieldLabel>
            <Input id={id(name)} name={name} type="number" min={0} required defaultValue={value} />
          </Field>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={id("extraBed")} name="extraBedAllowed" defaultChecked={type?.extraBedAllowed} />
        <Label htmlFor={id("extraBed")} className="font-normal">
          Extra bed allowed
        </Label>
      </div>
    </FieldGroup>
  );
}

/** Adds a room type: what it is, and how many guests it takes (RM-01). */
export function RoomTypeForm({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createRoomType.bind(null, propertyId), undefined);
  useFormFeedback(state, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add a room type
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add a room type</DialogTitle>
            <DialogDescription>A kind of room, such as Garden View Cottage. Add its units, the rooms themselves, next.</DialogDescription>
          </DialogHeader>
          <RoomTypeFields prefix="new-type" />
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

/** Changes a room type (RM-01). Its code stays, because it links the type's photos and text. */
export function RoomTypeEditForm({ type }: { type: RoomTypeValues }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(editRoomType.bind(null, type.id), undefined);
  useFormFeedback(state, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Change
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Change {type.name}</DialogTitle>
            <DialogDescription>Its code stays the same, because it links the room type&apos;s photos and text.</DialogDescription>
          </DialogHeader>
          <RoomTypeFields prefix={type.id} type={type} />
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
export function AddUnitsForm({ roomTypeId, suggestion }: { roomTypeId: string; suggestion: string }) {
  const [state, action, pending] = useActionState(addUnits.bind(null, roomTypeId), undefined);
  useFormFeedback(state);
  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-muted/40 p-4">
      <p className="text-sm font-medium">Add units</p>
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-40">
          <FieldLabel htmlFor={`${roomTypeId}-prefix`}>Unit name</FieldLabel>
          <Input id={`${roomTypeId}-prefix`} name="prefix" required defaultValue={suggestion} className="bg-background" />
        </Field>
        <Field className="w-24">
          <FieldLabel htmlFor={`${roomTypeId}-from`}>From</FieldLabel>
          <Input id={`${roomTypeId}-from`} name="from" type="number" min={0} placeholder="1" className="bg-background" />
        </Field>
        <Field className="w-24">
          <FieldLabel htmlFor={`${roomTypeId}-to`}>To</FieldLabel>
          <Input id={`${roomTypeId}-to`} name="to" type="number" min={0} placeholder="12" className="bg-background" />
        </Field>
        <Field className="w-36">
          <FieldLabel htmlFor={`${roomTypeId}-block`}>Block or floor</FieldLabel>
          <Input id={`${roomTypeId}-block`} name="block" className="bg-background" />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? <Spinner /> : <Plus />}
          Add units
        </Button>
      </div>
      <FieldDescription>One unit by its name, or a numbered run such as Cottage 1 to Cottage 12.</FieldDescription>
      <FormNote state={state} />
    </form>
  );
}

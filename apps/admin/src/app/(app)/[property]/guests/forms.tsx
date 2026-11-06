"use client";

import { useState } from "react";
import { Save, UserX } from "lucide-react";
import { FormNote, useToastAction } from "@/components/form-note";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { removeGuestDetails, saveGuestProfile } from "./actions";

/** Tags, a note and marketing consent, kept across all the guest's bookings. */
export function GuestProfileForm({ guestId, propertyId, tags, note, consent }: { guestId: string; propertyId: string; tags: string[]; note: string | null; consent: boolean }) {
  const [state, action, pending] = useToastAction(saveGuestProfile.bind(null, guestId, propertyId));
  return (
    <form action={action} className="grid gap-4">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="guest-tags">Tags</FieldLabel>
          <Input id="guest-tags" name="tags" defaultValue={tags.join(", ")} placeholder="VIP, corporate, birthday in June" />
          <FieldDescription>Separate tags with commas.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="guest-note">Note</FieldLabel>
          <Textarea id="guest-note" name="note" rows={3} defaultValue={note ?? ""} placeholder="Prefers the riverside rooms. Pure veg." />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="guest-consent" className="font-normal">
            Agreed to hear about offers
          </Label>
          <Switch id="guest-consent" name="marketingConsent" defaultChecked={consent} />
        </div>
      </FieldGroup>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? <Spinner /> : <Save />}
        Save
      </Button>
      <FormNote state={state} />
    </form>
  );
}

/** Removes the guest's personal details on their request. It asks first. */
export function RemoveGuestButton({ guestId, propertyId, name }: { guestId: string; propertyId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(async () => removeGuestDetails(guestId, propertyId), () => setOpen(false));
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive">
          <UserX />
          Remove their personal details
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {name}&apos;s personal details?</AlertDialogTitle>
            <AlertDialogDescription>
              Their name, phone, email and company go from every booking and lead, at every resort. The bookings and their money stay, as tax law needs. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormNote state={state} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Keep them</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Spinner />}
              Yes, remove them
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

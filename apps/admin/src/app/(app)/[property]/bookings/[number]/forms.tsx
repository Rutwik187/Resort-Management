"use client";

import { useActionState, useState } from "react";
import { ArrowRightLeft, Ban, IndianRupee, LogIn, LogOut, PencilLine, Printer, UserX } from "lucide-react";
import { toast } from "sonner";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { methodLabel } from "@/lib/format";
import { cancelBooking, changePrice, changeRoom, moveBooking, noteBooking, takePayment } from "./actions";

const moves = {
  checked_in: { label: "Check in", icon: LogIn },
  checked_out: { label: "Check out", icon: LogOut },
} as const;

/** Check in or check out: one press. Errors, such as checking in before the arrival day, show as a toast. */
export function MoveButton({ bookingId, to }: { bookingId: string; to: keyof typeof moves }) {
  const [pending, setPending] = useState(false);
  const { label, icon: Icon } = moves[to];
  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await moveBooking(bookingId, to);
        setPending(false);
        if (result?.error) toast.error(result.error);
        else if (result?.done) toast.success(result.done);
      }}
    >
      {pending ? <Spinner /> : <Icon />}
      {label}
    </Button>
  );
}

/** Marking a no-show frees the rooms from today, so it asks first. */
export function NoShowButton({ bookingId }: { bookingId: string }) {
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <UserX />
          Mark as no-show
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this guest as a no-show?</AlertDialogTitle>
          <AlertDialogDescription>The booking stays on record, and its rooms or seats go back on sale from today.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep the booking</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const result = await moveBooking(bookingId, "no_show");
              setPending(false);
              setOpen(false);
              if (result?.error) toast.error(result.error);
              else if (result?.done) toast.success(result.done);
            }}
          >
            {pending && <Spinner />}
            Mark as no-show
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Cancelling needs a reason and a second look. */
export function CancelForm({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelBooking.bind(null, bookingId), undefined);
  useFormFeedback(state, () => setOpen(false));
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Ban />
          Cancel the booking
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>Its rooms and seats go back on sale at once. The booking stays on record with your reason.</AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="cancel-reason">Why is it cancelled?</FieldLabel>
            <Input id="cancel-reason" name="reason" required minLength={3} placeholder="Guest changed plans" autoFocus />
          </Field>
          <FormNote state={state} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Keep the booking</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Spinner />}
              Cancel and free the rooms
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Money taken at the desk or by bank transfer. */
export function PaymentForm({ bookingId, suggested }: { bookingId: string; suggested: string }) {
  const [state, action, pending] = useActionState(takePayment.bind(null, bookingId), undefined);
  useFormFeedback(state);
  return (
    <form action={action} className="grid gap-4 rounded-lg border bg-muted/40 p-4">
      <p className="text-sm font-medium">Record a payment</p>
      <FieldGroup className="grid gap-4 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="pay-method">Paid by</FieldLabel>
          <Select name="method" required>
            <SelectTrigger id="pay-method" className="w-full bg-background">
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(methodLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="pay-amount">Amount (₹)</FieldLabel>
          <Input id="pay-amount" name="amount" required inputMode="decimal" defaultValue={suggested} className="bg-background" />
        </Field>
        <Field>
          <FieldLabel htmlFor="pay-reference">Reference</FieldLabel>
          <Input id="pay-reference" name="reference" placeholder="UPI, card or receipt no." className="bg-background" />
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : <IndianRupee />}
          Record payment
        </Button>
        <FormNote state={state} />
      </div>
    </form>
  );
}

/** A price set by hand needs a reason (ADM-07). */
export function PriceForm({ bookingId, current }: { bookingId: string; current: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(changePrice.bind(null, bookingId), undefined);
  useFormFeedback(state, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <PencilLine />
          Set the price
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Set the price</DialogTitle>
            <DialogDescription>The price for the whole booking. The audit log keeps the old price and your reason.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="price-amount">Price (₹)</FieldLabel>
              <Input id="price-amount" name="amount" required inputMode="decimal" defaultValue={current} />
            </Field>
            <Field>
              <FieldLabel htmlFor="price-reason">Why</FieldLabel>
              <Input id="price-reason" name="reason" required minLength={3} placeholder="Rate agreed with the guest" />
            </Field>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Save the price
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Moves a stay to another free room of the same type (RM-04). */
export function RoomForm({ bookingItemId, rooms }: { bookingItemId: string; rooms: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(changeRoom.bind(null, bookingItemId), undefined);
  useFormFeedback(state);
  if (rooms.length === 0) return <p className="text-xs text-muted-foreground">No other room of this type is free for these nights.</p>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Select name="unitId" required>
        <SelectTrigger size="sm" className="w-48" aria-label="Move to">
          <SelectValue placeholder="Move to another room" />
        </SelectTrigger>
        <SelectContent>
          {rooms.map((room) => (
            <SelectItem key={room.id} value={room.id}>
              {room.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? <Spinner /> : <ArrowRightLeft />}
        Move
      </Button>
      <FormNote state={state} />
    </form>
  );
}

/** An internal note on the timeline. Guests never see it. */
export function NoteForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(noteBooking.bind(null, bookingId), undefined);
  const [text, setText] = useState("");
  useFormFeedback(state, () => setText(""));
  return (
    <form action={action} className="grid gap-3">
      <Field>
        <FieldLabel htmlFor="note">Internal note</FieldLabel>
        <Textarea id="note" name="note" required rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Only staff see this." />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending || !text.trim()}>
        {pending && <Spinner />}
        Add note
      </Button>
      <FormNote state={state} />
    </form>
  );
}

export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer />
      Print
    </Button>
  );
}

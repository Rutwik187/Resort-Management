"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DateField } from "@/components/date-field";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deleteOffer, saveOffer, setOfferActive } from "./actions";

export type OfferValues = {
  id: string;
  title: string;
  details: string | null;
  code: string | null;
  discountKind: "percent" | "amount" | "none";
  discountValue: number | null;
  appliesTo: "stay" | "day" | "any";
  startsOn: string | null;
  endsOn: string | null;
  minNights: number | null;
  onWebsite: boolean;
  active: boolean;
};

/** Adds an offer or coupon, or changes one. */
export function OfferDialog({ propertyId, offer }: { propertyId: string; offer?: OfferValues }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OfferValues["discountKind"]>(offer?.discountKind ?? "percent");
  const [scope, setScope] = useState<OfferValues["appliesTo"]>(offer?.appliesTo ?? "stay");
  const [state, action, pending] = useToastAction(saveOffer.bind(null, propertyId, offer?.id ?? null), () => setOpen(false));
  const id = (name: string) => `${offer?.id ?? "new-offer"}-${name}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {offer ? (
          <Button variant="outline" size="sm">
            <Pencil />
            Change
          </Button>
        ) : (
          <Button>
            <Plus />
            Add an offer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{offer ? `Change ${offer.title}` : "Add an offer"}</DialogTitle>
            <DialogDescription>An offer anyone gets, or a coupon with a code the team gives out. Each booking takes one.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={id("title")}>Title</FieldLabel>
              <Input id={id("title")} name="title" required minLength={3} maxLength={120} defaultValue={offer?.title} placeholder="Monsoon weekdays: 15% off" />
            </Field>
            <Field>
              <FieldLabel htmlFor={id("details")}>Details</FieldLabel>
              <Textarea id={id("details")} name="details" rows={2} maxLength={500} defaultValue={offer?.details ?? ""} placeholder="Sunday to Thursday nights, June to September." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={id("kind")}>Takes off</FieldLabel>
                <Select name="discountKind" value={kind} onValueChange={(v) => setKind(v as OfferValues["discountKind"])}>
                  <SelectTrigger id={id("kind")} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">A percentage</SelectItem>
                    <SelectItem value="amount">An amount</SelectItem>
                    <SelectItem value="none">Nothing: the team applies it</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {kind === "percent" && (
                <Field>
                  <FieldLabel htmlFor={id("percent")}>Percent off</FieldLabel>
                  <Input id={id("percent")} name="percent" type="number" min={1} max={100} required defaultValue={offer?.discountKind === "percent" ? (offer.discountValue ?? "") : ""} />
                </Field>
              )}
              {kind === "amount" && (
                <Field>
                  <FieldLabel htmlFor={id("amount")}>Amount off (₹)</FieldLabel>
                  <Input id={id("amount")} name="amount" inputMode="decimal" required defaultValue={offer?.discountKind === "amount" && offer.discountValue ? String(offer.discountValue / 100) : ""} />
                </Field>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={id("scope")}>For</FieldLabel>
                <Select name="appliesTo" value={scope} onValueChange={(v) => setScope(v as OfferValues["appliesTo"])}>
                  <SelectTrigger id={id("scope")} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stay">Stays</SelectItem>
                    <SelectItem value="day">Day visits</SelectItem>
                    <SelectItem value="any">Stays and day visits</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={id("code")}>Coupon code</FieldLabel>
                <Input id={id("code")} name="code" maxLength={20} defaultValue={offer?.code ?? ""} placeholder="Leave empty for everyone" className="font-mono uppercase" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor={id("from")}>From</FieldLabel>
                <DateField id={id("from")} name="startsOn" defaultValue={offer?.startsOn ?? undefined} placeholder="Any day" />
              </Field>
              <Field>
                <FieldLabel htmlFor={id("to")}>Until</FieldLabel>
                <DateField id={id("to")} name="endsOn" defaultValue={offer?.endsOn ?? undefined} placeholder="No end" />
              </Field>
              {scope !== "day" && (
                <Field>
                  <FieldLabel htmlFor={id("nights")}>Fewest nights</FieldLabel>
                  <Input id={id("nights")} name="minNights" type="number" min={1} max={60} defaultValue={offer?.minNights ?? ""} placeholder="Any stay" />
                </Field>
              )}
            </div>
            <FieldDescription>The dates are the nights or visit days it covers, not when the guest books.</FieldDescription>
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={id("web")} className="font-normal">
                  Show it on the website
                </Label>
                <Switch id={id("web")} name="onWebsite" defaultChecked={offer?.onWebsite ?? true} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={id("active")} className="font-normal">
                  On now
                </Label>
                <Switch id={id("active")} name="active" defaultChecked={offer?.active ?? true} />
              </div>
            </div>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {offer ? "Save changes" : "Add offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Turns an offer on or off at once. */
export function OfferSwitch({ offerId, active }: { offerId: string; active: boolean }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await setOfferActive(offerId, !active);
        setPending(false);
        if (result?.error) toast.error(result.error);
        else if (result?.done) toast.success(result.done);
      }}
    >
      {pending ? <Spinner /> : active ? <EyeOff /> : <Eye />}
      {active ? "Turn off" : "Turn on"}
    </Button>
  );
}

export function DeleteOfferButton({ offerId, title }: { offerId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(async () => deleteOffer(offerId), () => setOpen(false));
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${title}`}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {title}?</AlertDialogTitle>
            <AlertDialogDescription>It goes from the website and the booking form. Bookings that used it keep their price.</AlertDialogDescription>
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

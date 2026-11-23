"use client";

import { useState } from "react";
import { CalendarHeart, ChevronDown, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deleteOffer, removeOfferDay, saveOffer, scheduleOfferDay, setOfferActive } from "./actions";

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
  kind: "standard" | "early_bird" | "last_minute" | "long_stay" | "festival";
  bookFrom: string | null;
  bookTo: string | null;
  minDaysAhead: number | null;
  maxDaysAhead: number | null;
  weekdays: number[] | null;
  roomTypeIds: string[];
  offeringIds: string[];
  freeNights: number | null;
  maxUses: number | null;
  maxUsesPerGuest: number | null;
  minAmountPaise: number | null;
  showCode: boolean;
};

/** The rooms and packages an offer can be limited to. */
export type OfferChoices = { rooms: { id: string; name: string }[]; passes: { id: string; name: string }[] };

export const offerKindLabel = { standard: "Standard", early_bird: "Early bird", last_minute: "Last minute", long_stay: "Long stay", festival: "Festival" } as const;
const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const tick = "size-4 rounded border-input accent-primary";

/** Adds an offer or coupon, or changes one. */
export function OfferDialog({ propertyId, offer, choices }: { propertyId: string; offer?: OfferValues; choices: OfferChoices }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OfferValues["discountKind"]>(offer?.discountKind ?? "percent");
  const [scope, setScope] = useState<OfferValues["appliesTo"]>(offer?.appliesTo ?? "stay");
  const [code, setCode] = useState(offer?.code ?? "");
  const hasRules = Boolean(
    offer && (offer.bookFrom || offer.bookTo || offer.minDaysAhead || offer.maxDaysAhead !== null || offer.weekdays?.length || offer.roomTypeIds.length || offer.offeringIds.length || offer.freeNights || offer.maxUses || offer.maxUsesPerGuest || offer.minAmountPaise),
  );
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
                <Input id={id("code")} name="code" maxLength={20} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Leave empty for everyone" className="font-mono uppercase placeholder:font-sans placeholder:normal-case" />
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
            <Collapsible defaultOpen={hasRules} className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium [&[data-state=open]>svg]:rotate-180">
                  More rules: when to book, days, rooms, limits
                  <ChevronDown className="size-4 text-muted-foreground transition-transform" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="grid gap-4 border-t px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={id("offerKind")}>Kind</FieldLabel>
                    <Select name="kind" defaultValue={offer?.kind ?? "standard"}>
                      <SelectTrigger id={id("offerKind")} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(offerKindLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {scope !== "day" && (
                    <Field>
                      <FieldLabel htmlFor={id("free")}>Free nights</FieldLabel>
                      <Input id={id("free")} name="freeNights" type="number" min={1} max={30} defaultValue={offer?.freeNights ?? ""} placeholder="1 for stay 3, pay 2" />
                    </Field>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={id("bookFrom")}>Book from</FieldLabel>
                    <DateField id={id("bookFrom")} name="bookFrom" defaultValue={offer?.bookFrom ?? undefined} placeholder="Any day" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={id("bookTo")}>Book until</FieldLabel>
                    <DateField id={id("bookTo")} name="bookTo" defaultValue={offer?.bookTo ?? undefined} placeholder="No end" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={id("minAhead")}>Days before arrival, at least</FieldLabel>
                    <Input id={id("minAhead")} name="minDaysAhead" type="number" min={1} max={365} defaultValue={offer?.minDaysAhead ?? ""} placeholder="Early bird, such as 30" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={id("maxAhead")}>Days before arrival, at most</FieldLabel>
                    <Input id={id("maxAhead")} name="maxDaysAhead" type="number" min={0} max={365} defaultValue={offer?.maxDaysAhead ?? ""} placeholder="Last minute, such as 3" />
                  </Field>
                </div>
                <fieldset className="grid gap-2">
                  <legend className="mb-1 text-sm font-medium">{scope === "day" ? "Visit days" : "Nights"} it covers</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {weekdayShort.map((label, day) => (
                      <label key={day} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="weekdays" value={day} defaultChecked={!offer?.weekdays?.length || offer.weekdays.includes(day)} className={tick} />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {scope !== "day" && choices.rooms.length > 0 && (
                  <fieldset className="grid gap-2">
                    <legend className="mb-1 text-sm font-medium">Rooms it covers</legend>
                    <FieldDescription>Tick none for all rooms. The discount comes off these rooms only, never add-ons.</FieldDescription>
                    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                      {choices.rooms.map((room) => (
                        <label key={room.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="roomTypeIds" value={room.id} defaultChecked={offer?.roomTypeIds.includes(room.id)} className={tick} />
                          {room.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                {scope !== "stay" && choices.passes.length > 0 && (
                  <fieldset className="grid gap-2">
                    <legend className="mb-1 text-sm font-medium">Packages it covers</legend>
                    <FieldDescription>Tick none for all packages.</FieldDescription>
                    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                      {choices.passes.map((pass) => (
                        <label key={pass.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="offeringIds" value={pass.id} defaultChecked={offer?.offeringIds.includes(pass.id)} className={tick} />
                          {pass.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor={id("maxUses")}>Most uses</FieldLabel>
                    <Input id={id("maxUses")} name="maxUses" type="number" min={1} defaultValue={offer?.maxUses ?? ""} placeholder="No limit" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={id("perGuest")}>Most per guest</FieldLabel>
                    <Input id={id("perGuest")} name="maxUsesPerGuest" type="number" min={1} defaultValue={offer?.maxUsesPerGuest ?? ""} placeholder="No limit" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={id("minAmount")}>Least amount (₹)</FieldLabel>
                    <Input id={id("minAmount")} name="minAmount" inputMode="decimal" defaultValue={offer?.minAmountPaise ? String(offer.minAmountPaise / 100) : ""} placeholder="Before GST" />
                  </Field>
                </div>
                {code && (
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={id("showCode")} className="font-normal">
                      Public coupon: show the code on the website
                    </Label>
                    <Switch id={id("showCode")} name="showCode" defaultChecked={offer?.showCode ?? false} />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
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

/** Schedules the Offer of the Day for a date (OFR-01). */
export function OfferDayDialog({ propertyId, offers, today }: { propertyId: string; offers: { id: string; title: string }[]; today: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(scheduleOfferDay.bind(null, propertyId), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={offers.length === 0}>
          <CalendarHeart />
          Schedule a day
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Offer of the Day</DialogTitle>
            <DialogDescription>It shows on the home and offers pages with a countdown, and ends at midnight or when its bookings run out.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="offer-day-date">Day</FieldLabel>
              <DateField id="offer-day-date" name="day" min={today} placeholder="Choose the day" />
            </Field>
            <Field>
              <FieldLabel htmlFor="offer-day-offer">Offer</FieldLabel>
              <Select name="offerId">
                <SelectTrigger id="offer-day-offer" className="w-full">
                  <SelectValue placeholder="Choose an offer" />
                </SelectTrigger>
                <SelectContent>
                  {offers.map((offer) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Only offers that take something off by themselves. Scheduled offers apply by themselves on their days only.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="offer-day-quantity">Most bookings that day</FieldLabel>
              <Input id="offer-day-quantity" name="quantity" type="number" min={1} placeholder="No limit" />
            </Field>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveOfferDayButton({ dayId, label }: { dayId: string; label: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-destructive"
      aria-label={`Remove the offer from ${label}`}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await removeOfferDay(dayId);
        setPending(false);
        if (result?.error) toast.error(result.error);
        else if (result?.done) toast.success(result.done);
      }}
    >
      {pending ? <Spinner /> : <X />}
    </Button>
  );
}

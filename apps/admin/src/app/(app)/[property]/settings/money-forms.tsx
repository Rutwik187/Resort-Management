"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
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
import { addTaxRule, removeCancellationRule, removeTaxRule, saveCancellationRule, savePayments } from "./money-actions";

/** The resort's Razorpay keys. Saved secrets never come back to the browser. */
export function PaymentKeysForm({ propertyId, saved, webhookUrl }: { propertyId: string; saved: { keyId: string; active: boolean; hasWebhookSecret: boolean } | null; webhookUrl: string }) {
  const [state, action, pending] = useToastAction(savePayments.bind(null, propertyId));
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="keyId">Key id</FieldLabel>
          <Input id="keyId" name="keyId" required defaultValue={saved?.keyId ?? ""} placeholder="rzp_live_…" autoComplete="off" />
        </Field>
        <Field>
          <FieldLabel htmlFor="keySecret">Key secret</FieldLabel>
          <Input id="keySecret" name="keySecret" type="password" autoComplete="new-password" placeholder={saved ? "Saved. Type to replace it." : ""} required={!saved} />
        </Field>
        <Field>
          <FieldLabel htmlFor="webhookSecret">Webhook secret</FieldLabel>
          <Input id="webhookSecret" name="webhookSecret" type="password" autoComplete="new-password" placeholder={saved?.hasWebhookSecret ? "Saved. Type to replace it." : "From Razorpay's webhook settings"} />
        </Field>
      </div>
      <Field>
        <FieldLabel>Webhook address for Razorpay</FieldLabel>
        <div className="flex gap-2">
          <Input readOnly value={webhookUrl} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Copy the webhook address"
            onClick={async () => {
              await navigator.clipboard.writeText(webhookUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
        <FieldDescription>In Razorpay: Settings, Webhooks, Add. Choose payment.captured, payment.failed, order.paid, payment_link.paid, refund.processed and refund.failed.</FieldDescription>
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Label className="flex items-center gap-2 font-normal">
          <Switch name="active" defaultChecked={saved?.active ?? true} />
          Take payments online
        </Label>
        <FormNote state={state} />
        <Button type="submit" className="ml-auto" disabled={pending}>
          {pending ? <Spinner /> : <KeyRound />}
          Save keys
        </Button>
      </div>
    </form>
  );
}

export function TaxRuleDialog({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(addTaxRule.bind(null, propertyId), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          Add rule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add a GST rule</DialogTitle>
            <DialogDescription>When GST changes, add a rule from the day it changes. Older bookings keep the rate they had.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Covers</FieldLabel>
              <Select name="appliesTo" defaultValue="room">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">Rooms, by price per night</SelectItem>
                  <SelectItem value="offering">Day packages, activities and meals</SelectItem>
                  <SelectItem value="addon">Add-ons</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="tax-label">Name</FieldLabel>
              <Input id="tax-label" name="label" required placeholder="Rooms from ₹1,000 to ₹7,500 a night" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="tax-from">From ₹ per unit per day</FieldLabel>
                <Input id="tax-from" name="from" inputMode="decimal" placeholder="0" />
              </Field>
              <Field>
                <FieldLabel htmlFor="tax-to">Up to ₹</FieldLabel>
                <Input id="tax-to" name="to" inputMode="decimal" placeholder="No limit" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="tax-rate">GST %</FieldLabel>
                <Input id="tax-rate" name="rate" inputMode="decimal" required placeholder="5" />
              </Field>
              <Field>
                <FieldLabel htmlFor="tax-sac">SAC code</FieldLabel>
                <Input id="tax-sac" name="sac" inputMode="numeric" placeholder="996311" />
              </Field>
              <Field>
                <FieldLabel htmlFor="tax-start">From</FieldLabel>
                <DateField id="tax-start" name="startsOn" />
              </Field>
            </div>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Add rule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancellationRuleDialog({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(saveCancellationRule.bind(null, propertyId), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          Add rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add a cancellation rule</DialogTitle>
            <DialogDescription>For example: 8 or more days before arrival, 100% back. A rule with the same days replaces the old one.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>For</FieldLabel>
              <Select name="appliesTo" defaultValue="any">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Stays and day visits</SelectItem>
                  <SelectItem value="stay">Stays only</SelectItem>
                  <SelectItem value="day">Day visits only</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cancel-days">Days before, or more</FieldLabel>
                <Input id="cancel-days" name="daysBefore" type="number" min={0} max={365} required placeholder="8" />
              </Field>
              <Field>
                <FieldLabel htmlFor="cancel-percent">Refund %</FieldLabel>
                <Input id="cancel-percent" name="refundPercent" type="number" min={0} max={100} required placeholder="100" />
              </Field>
            </div>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Save rule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveRuleButton({ propertyId, ruleId, kind, label }: { propertyId: string; ruleId: string; kind: "tax" | "cancellation"; label: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(async () => (kind === "tax" ? removeTaxRule(propertyId, ruleId) : removeCancellationRule(propertyId, ruleId)), () => setOpen(false));
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${label}`}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {kind === "tax" ? "New quotes stop using it. Invoices already issued keep their GST. To change a rate from a date, add a new rule instead." : "New refund suggestions stop using it."}
            </AlertDialogDescription>
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

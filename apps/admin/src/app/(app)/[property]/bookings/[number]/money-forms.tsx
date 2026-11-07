"use client";

import { useState } from "react";
import { Check, Copy, Link2, RotateCcw, Undo2, X } from "lucide-react";
import { FormNote, useToastAction } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { methodLabel } from "@/lib/format";
import { approveRefund, askRefund, sendPaymentLink, tryRefundAgain } from "./money-actions";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      aria-label={label}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

/** Sends the guest a Razorpay link for the balance, or another amount. */
export function PaymentLinkForm({ bookingId, balance }: { bookingId: string; balance: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(sendPaymentLink.bind(null, bookingId), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2 />
          Send a payment link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Send a payment link</DialogTitle>
            <DialogDescription>Razorpay sends it to the guest&apos;s phone and email. It lasts 7 days, and the booking updates when they pay.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="link-amount">Amount (₹)</FieldLabel>
            <Input id="link-amount" name="amount" inputMode="decimal" defaultValue={balance} />
            <FieldDescription>The balance, unless you change it.</FieldDescription>
          </Field>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : <Link2 />}
              Send link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Asks for a refund, with the cancellation rules' suggestion filled in. */
export function RefundForm({ bookingId, suggested, paidOnline, needsApproval }: { bookingId: string; suggested: string; paidOnline: boolean; needsApproval: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(askRefund.bind(null, bookingId), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Undo2 />
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Refund the guest</DialogTitle>
            <DialogDescription>
              {needsApproval ? "This waits for someone who may approve refunds." : "It starts at once."} A refund to an online payment goes back through Razorpay; others are paid by hand.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="refund-amount">Amount (₹)</FieldLabel>
                <Input id="refund-amount" name="amount" required inputMode="decimal" defaultValue={suggested} />
              </Field>
              <Field>
                <FieldLabel>Back by</FieldLabel>
                <Select name="method" defaultValue={paidOnline ? "razorpay" : "cash"}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paidOnline && <SelectItem value="razorpay">Razorpay, to the online payment</SelectItem>}
                    {Object.entries(methodLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="refund-reason">Why</FieldLabel>
              <Input id="refund-reason" name="reason" required minLength={3} placeholder="Cancelled 10 days before arrival" />
            </Field>
            <Field>
              <FieldLabel htmlFor="refund-reference">Reference, for one paid by hand</FieldLabel>
              <Input id="refund-reference" name="reference" placeholder="UTR or receipt number" />
            </Field>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {needsApproval ? "Ask for approval" : "Refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RefundDecision({ refundId }: { refundId: string }) {
  const [, approve, approving] = useToastAction(async () => approveRefund(refundId, true));
  const [, reject, rejecting] = useToastAction(async () => approveRefund(refundId, false));
  return (
    <div className="flex gap-2">
      <form action={approve}>
        <Button size="sm" type="submit" disabled={approving || rejecting}>
          {approving ? <Spinner /> : <Check />}
          Approve
        </Button>
      </form>
      <form action={reject}>
        <Button size="sm" variant="outline" type="submit" disabled={approving || rejecting}>
          {rejecting ? <Spinner /> : <X />}
          Reject
        </Button>
      </form>
    </div>
  );
}

export function RetryRefund({ refundId }: { refundId: string }) {
  const [state, action, pending] = useToastAction(async () => tryRefundAgain(refundId));
  return (
    <form action={action} className="flex items-center gap-2">
      <Button size="sm" variant="outline" type="submit" disabled={pending}>
        {pending ? <Spinner /> : <RotateCcw />}
        Try again
      </Button>
      {state?.error && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}

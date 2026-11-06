"use client";

import { useState } from "react";
import { MessageSquarePlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { DateField } from "@/components/date-field";
import { FormNote, useToastAction } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { leadInterestLabel, leadSourceLabel, leadStatusLabel } from "@/lib/format";
import { addLeadNote, assignLead, createLead, setFollowUp, setLeadStatus } from "./actions";

const staffSources = ["phone", "walk_in", "whatsapp", "email", "referral", "other"] as const;

/** A lead that came by phone, at the desk or from a referral (the website adds its own). */
export function NewLeadDialog({ propertyId }: { propertyId: string }) {
  const [state, action, pending] = useToastAction(createLead.bind(null, propertyId));
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add a lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add a lead</DialogTitle>
            <DialogDescription>Someone who asked by phone, at the desk or through a friend. Website requests arrive here by themselves.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="lead-name">Name</FieldLabel>
              <Input id="lead-name" name="name" required minLength={2} autoComplete="off" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="lead-phone">Phone</FieldLabel>
                <Input id="lead-phone" name="phone" type="tel" inputMode="tel" placeholder="98765 43210" autoComplete="off" />
              </Field>
              <Field>
                <FieldLabel htmlFor="lead-email">Email</FieldLabel>
                <Input id="lead-email" name="email" type="email" autoComplete="off" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="lead-interest">Wants</FieldLabel>
                <Select name="interest" defaultValue="stay">
                  <SelectTrigger id="lead-interest" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(leadInterestLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="lead-source">Came by</FieldLabel>
                <Select name="source" defaultValue="phone">
                  <SelectTrigger id="lead-source" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {staffSources.map((value) => (
                      <SelectItem key={value} value={value}>
                        {leadSourceLabel[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="lead-from">Date</FieldLabel>
                <DateField id="lead-from" name="dateFrom" placeholder="When" />
              </Field>
              <Field>
                <FieldLabel htmlFor="lead-to">Until</FieldLabel>
                <DateField id="lead-to" name="dateTo" placeholder="For a stay" />
              </Field>
              <Field>
                <FieldLabel htmlFor="lead-guests">Guests</FieldLabel>
                <Input id="lead-guests" name="guests" type="number" min={1} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="lead-message">What they asked</FieldLabel>
              <Textarea id="lead-message" name="message" rows={3} />
            </Field>
            <Field>
              <FieldLabel htmlFor="lead-follow">Follow up on</FieldLabel>
              <DateField id="lead-follow" name="followUpOn" placeholder="No follow-up yet" />
              <FieldDescription>It shows on the Today page that day.</FieldDescription>
            </Field>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Add lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Where the lead stands. Booked comes from making its booking, so it isn't offered here. */
export function LeadStatusForm({ leadId, status }: { leadId: string; status: keyof typeof leadStatusLabel }) {
  const [choice, setChoice] = useState<string>(status === "won" ? "won" : status);
  const [state, action, pending] = useToastAction(setLeadStatus.bind(null, leadId));
  return (
    <form action={action} className="grid gap-3">
      <Field>
        <FieldLabel htmlFor="lead-status">Status</FieldLabel>
        <Select name="status" value={choice} onValueChange={setChoice} disabled={status === "won"}>
          <SelectTrigger id="lead-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["new", "contacted", "quoted", "lost"] as const).map((value) => (
              <SelectItem key={value} value={value}>
                {leadStatusLabel[value]}
              </SelectItem>
            ))}
            {status === "won" && <SelectItem value="won">{leadStatusLabel.won}</SelectItem>}
          </SelectContent>
        </Select>
      </Field>
      {choice === "lost" && status !== "lost" && (
        <Field>
          <FieldLabel htmlFor="lead-reason">Why it was lost</FieldLabel>
          <Input id="lead-reason" name="reason" required minLength={3} placeholder="Booked elsewhere, too far, the price" />
        </Field>
      )}
      {status !== "won" && choice !== status && (
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Spinner />}
          Save status
        </Button>
      )}
      <FormNote state={state} />
    </form>
  );
}

/** Who works the lead. Changes save at once. */
export function AssignSelect({ leadId, assignedTo, workers }: { leadId: string; assignedTo: string | null; workers: { id: string; name: string }[] }) {
  const [value, setValue] = useState(assignedTo ?? "none");
  const [pending, setPending] = useState(false);
  return (
    <Field>
      <FieldLabel htmlFor="lead-owner">Worked by</FieldLabel>
      <Select
        value={value}
        disabled={pending}
        onValueChange={async (next) => {
          setValue(next);
          setPending(true);
          const result = await assignLead(leadId, next === "none" ? null : next);
          setPending(false);
          if (result?.error) toast.error(result.error);
          else if (result?.done) toast.success(result.done);
        }}
      >
        <SelectTrigger id="lead-owner" className="w-full">
          <SelectValue />
          {pending && <Spinner className="ml-auto" />}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No one yet</SelectItem>
          {workers.map((worker) => (
            <SelectItem key={worker.id} value={worker.id}>
              {worker.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** The day to get back to the guest. Picking one saves it. */
export function FollowUpField({ leadId, value }: { leadId: string; value: string | null }) {
  const save = async (day: string | null) => {
    const result = await setFollowUp(leadId, day);
    if (result?.error) toast.error(result.error);
    else if (result?.done) toast.success(result.done);
  };
  return (
    <Field>
      <FieldLabel htmlFor="lead-follow-up">Follow up on</FieldLabel>
      <div className="flex gap-2">
        <DateField key={value ?? "none"} id="lead-follow-up" name="followUpOn" defaultValue={value ?? undefined} placeholder="No follow-up set" onChange={(day) => save(day || null)} />
        {value && (
          <Button type="button" variant="ghost" onClick={() => save(null)}>
            Clear
          </Button>
        )}
      </div>
    </Field>
  );
}

/** A note on the timeline. The first note on a new lead marks it contacted. */
export function LeadNoteForm({ leadId }: { leadId: string }) {
  const [text, setText] = useState("");
  const [state, action, pending] = useToastAction(addLeadNote.bind(null, leadId), () => setText(""));
  return (
    <form action={action} className="grid gap-3">
      <Field>
        <FieldLabel htmlFor="lead-note">Add to the timeline</FieldLabel>
        <Textarea id="lead-note" name="note" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Called back: wants the glass house for 4, asked for a quote." />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending || !text.trim()}>
        {pending ? <Spinner /> : <MessageSquarePlus />}
        Add note
      </Button>
      <FormNote state={state} />
    </form>
  );
}

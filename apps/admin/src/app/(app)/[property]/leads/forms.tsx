"use client";

import { useState } from "react";
import { Banknote, Combine, FileText, MessageSquarePlus, Pencil, PhoneCall, Plus, Trash2, Users } from "lucide-react";
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
import { addLeadNote, assignLead, createLead, logLeadActivity, mergeLeadInto, recordLeadAdvance, saveAssignmentRule, saveQuotation, setFollowUp, setLeadStatus, updateLeadDetails } from "./actions";

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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="lead-budget">Budget</FieldLabel>
                <Input id="lead-budget" name="budget" maxLength={80} placeholder="₹5 to 8 lakh" />
              </Field>
              <Field>
                <FieldLabel htmlFor="lead-value">Estimated value (₹)</FieldLabel>
                <Input id="lead-value" name="estimatedValue" inputMode="decimal" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="lead-message">What they asked</FieldLabel>
              <Textarea id="lead-message" name="message" rows={3} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field>
                <FieldLabel htmlFor="lead-follow">Follow up on</FieldLabel>
                <DateField id="lead-follow" name="followUpOn" placeholder="No follow-up yet" />
              </Field>
              <Field>
                <FieldLabel htmlFor="lead-follow-time">At</FieldLabel>
                <Input id="lead-follow-time" name="followUpTime" type="time" />
              </Field>
            </div>
            <FieldDescription>It shows on the Today page when due, and the person on it gets a reminder.</FieldDescription>
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
            {(["new", "contacted", "site_visit_scheduled", "site_visit_done", "quoted", "negotiation", "lost"] as const).map((value) => (
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

/** The day and time to get back to the guest (CRM-04). Picking either saves it. */
export function FollowUpField({ leadId, value, time }: { leadId: string; value: string | null; time: string | null }) {
  const [at, setAt] = useState(time?.slice(0, 5) ?? "");
  const save = async (day: string | null, hhmm: string) => {
    const result = await setFollowUp(leadId, day, day && hhmm ? hhmm : null);
    if (result?.error) toast.error(result.error);
    else if (result?.done) toast.success(result.done);
  };
  return (
    <Field>
      <FieldLabel htmlFor="lead-follow-up">Follow up on</FieldLabel>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-40 flex-1">
          <DateField key={value ?? "none"} id="lead-follow-up" name="followUpOn" defaultValue={value ?? undefined} placeholder="No follow-up set" onChange={(day) => save(day || null, at)} />
        </div>
        <Input
          type="time"
          aria-label="Follow-up time"
          value={at}
          disabled={!value}
          onChange={(e) => setAt(e.target.value)}
          onBlur={() => value && at !== (time?.slice(0, 5) ?? "") && save(value, at)}
          className="w-28"
        />
        {value && (
          <Button type="button" variant="ghost" onClick={() => save(null, "")}>
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

export type LeadDetailsValues = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  interest: keyof typeof leadInterestLabel;
  dateFrom: string | null;
  dateTo: string | null;
  guests: number | null;
  budget: string | null;
  estimatedValuePaise: number | null;
};

/** Changes who the lead is and what they want, with budget and estimated value. */
export function LeadDetailsDialog({ lead }: { lead: LeadDetailsValues }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(updateLeadDetails.bind(null, lead.id), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Change details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Change {lead.name}&apos;s lead</DialogTitle>
            <DialogDescription>What they want, when, and what it may be worth.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="edit-name">Name</FieldLabel>
              <Input id="edit-name" name="name" required minLength={2} defaultValue={lead.name} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-phone">Phone</FieldLabel>
                <Input id="edit-phone" name="phone" type="tel" defaultValue={lead.phone ? `+${lead.phone}` : ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-email">Email</FieldLabel>
                <Input id="edit-email" name="email" type="email" defaultValue={lead.email ?? ""} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-interest">Wants</FieldLabel>
                <Select name="interest" defaultValue={lead.interest}>
                  <SelectTrigger id="edit-interest" className="w-full">
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
                <FieldLabel htmlFor="edit-guests">Guests</FieldLabel>
                <Input id="edit-guests" name="guests" type="number" min={1} defaultValue={lead.guests ?? ""} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-from">Date</FieldLabel>
                <DateField id="edit-from" name="dateFrom" defaultValue={lead.dateFrom ?? undefined} placeholder="When" />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-to">Until</FieldLabel>
                <DateField id="edit-to" name="dateTo" defaultValue={lead.dateTo ?? undefined} placeholder="For a stay" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-budget">Budget</FieldLabel>
                <Input id="edit-budget" name="budget" maxLength={80} defaultValue={lead.budget ?? ""} placeholder="₹5 to 8 lakh" />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-value">Estimated value (₹)</FieldLabel>
                <Input id="edit-value" name="estimatedValue" inputMode="decimal" defaultValue={lead.estimatedValuePaise ? String(lead.estimatedValuePaise / 100) : ""} />
              </Field>
            </div>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A call, WhatsApp, email or meeting, on the timeline (CRM-05). */
export function LogActivityForm({ leadId }: { leadId: string }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState("call");
  const [state, action, pending] = useToastAction(logLeadActivity.bind(null, leadId), () => setText(""));
  return (
    <form action={action} className="grid gap-3">
      <Field>
        <FieldLabel htmlFor="lead-log-kind">Log a conversation</FieldLabel>
        <Select name="kind" value={kind} onValueChange={setKind}>
          <SelectTrigger id="lead-log-kind" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="call">Phone call</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="meeting">Meeting or site visit</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Textarea name="note" rows={2} value={text} onChange={(e) => setText(e.target.value)} aria-label="What was said" placeholder="Spoke to the bride's father; wants the lawn for 300 on 14 Feb." />
      <Button type="submit" variant="secondary" disabled={pending || !text.trim()}>
        {pending ? <Spinner /> : <PhoneCall />}
        Log it
      </Button>
      <FormNote state={state} />
    </form>
  );
}

/** An advance taken against the lead, such as for a wedding (CRM-08). */
export function LeadAdvanceDialog({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(recordLeadAdvance.bind(null, leadId), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Banknote />
          Record an advance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Record an advance</DialogTitle>
            <DialogDescription>Money taken before the booking is made. When you make the booking, record it there as a payment too.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="adv-amount">Amount (₹)</FieldLabel>
                <Input id="adv-amount" name="amount" inputMode="decimal" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="adv-method">Paid by</FieldLabel>
                <Select name="method" defaultValue="upi">
                  <SelectTrigger id="adv-method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="adv-ref">Reference</FieldLabel>
              <Input id="adv-ref" name="reference" maxLength={80} placeholder="UPI ref or receipt number" />
            </Field>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Merges another lead from the same phone into this one (CRM-06). */
export function MergeLeadButton({ keepId, mergeId, name }: { keepId: string; mergeId: string; name: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm(`Merge ${name}'s other lead into this one? Its timeline moves here and it is removed.`)) return;
        setPending(true);
        const result = await mergeLeadInto(keepId, mergeId);
        setPending(false);
        if (result?.error) toast.error(result.error);
        else if (result?.done) toast.success(result.done);
      }}
    >
      {pending ? <Spinner /> : <Combine />}
      Merge here
    </Button>
  );
}

type QuoteLine = { key: number; title: string; quantity: string; rate: string };

/** Writes a quotation for the lead (CRM-09). Its page prints it or saves it as a PDF. */
export function QuotationDialog({ leadId, suggested }: { leadId: string; suggested: { title: string; ratePaise: number | null }[] }) {
  const [open, setOpen] = useState(false);
  const start = suggested.length ? suggested.map((s, i) => ({ key: i, title: s.title, quantity: "1", rate: s.ratePaise ? String(s.ratePaise / 100) : "" })) : [{ key: 0, title: "", quantity: "1", rate: "" }];
  const [lines, setLines] = useState<QuoteLine[]>(start);
  const [state, action, pending] = useToastAction(saveQuotation.bind(null, leadId), () => setOpen(false));
  const paise = (rate: string) => Math.round(Number(rate.replace(/[₹,\s]/g, "") || 0) * 100);
  const payload = JSON.stringify(lines.filter((l) => l.title.trim()).map((l) => ({ title: l.title.trim(), quantity: Math.max(1, Math.round(Number(l.quantity) || 1)), ratePaise: paise(l.rate) })));
  const total = lines.reduce((sum, l) => sum + paise(l.rate) * Math.max(1, Math.round(Number(l.quantity) || 1)), 0);
  const update = (key: number, patch: Partial<QuoteLine>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText />
          Write a quotation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Quotation</DialogTitle>
            <DialogDescription>Prices before GST. Saving moves the lead to Quotation sent; open the quotation to print it or save it as a PDF.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="lines" value={payload} />
          <div className="grid gap-2">
            {lines.map((line) => (
              <div key={line.key} className="grid grid-cols-[1fr_4.5rem_7rem_2rem] items-center gap-2">
                <Input aria-label="Item" value={line.title} onChange={(e) => update(line.key, { title: e.target.value })} placeholder="Lawn for the wedding, 300 guests" />
                <Input aria-label="Quantity" type="number" min={1} value={line.quantity} onChange={(e) => update(line.key, { quantity: e.target.value })} />
                <Input aria-label="Rate in rupees" inputMode="decimal" value={line.rate} onChange={(e) => update(line.key, { rate: e.target.value })} placeholder="Rate ₹" />
                <Button type="button" variant="ghost" size="icon" aria-label="Remove the line" onClick={() => setLines(lines.filter((l) => l.key !== line.key))} disabled={lines.length === 1}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines([...lines, { key: Math.max(...lines.map((l) => l.key)) + 1, title: "", quantity: "1", rate: "" }])}>
                <Plus />
                Add a line
              </Button>
              <span className="text-sm font-medium tabular-nums">₹{(total / 100).toLocaleString("en-IN")} before GST</span>
            </div>
          </div>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="quote-gst">GST to add (%)</FieldLabel>
                <Input id="quote-gst" name="gstPercent" type="number" min={0} max={28} defaultValue={18} />
              </Field>
              <Field>
                <FieldLabel htmlFor="quote-valid">Valid until</FieldLabel>
                <DateField id="quote-valid" name="validUntil" placeholder="No end date" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="quote-notes">Notes and terms</FieldLabel>
              <Textarea id="quote-notes" name="notes" rows={3} placeholder="50% advance to confirm. Decoration by our partner, quoted separately." />
            </Field>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Save quotation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Who new leads go to, in turn, for each kind of lead (CRM-02). */
export function AssignmentRulesDialog({ propertyId, workers, rules }: { propertyId: string; workers: { id: string; name: string }[]; rules: { interest: string | null; userIds: string[] }[] }) {
  const [open, setOpen] = useState(false);
  const [interest, setInterest] = useState("all");
  const [state, action, pending] = useToastAction(saveAssignmentRule.bind(null, propertyId));
  const current = rules.find((r) => (r.interest ?? "all") === interest)?.userIds ?? [];
  const label = (value: string | null) => (value ? leadInterestLabel[value as keyof typeof leadInterestLabel] : "Every kind");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users />
          Who gets new leads
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form action={action} className="grid gap-5" key={interest}>
          <DialogHeader>
            <DialogTitle>Who gets new leads</DialogTitle>
            <DialogDescription>Website, form and lead-ad leads go to the people you tick, in turn. A kind of lead with its own list uses it; the rest use Every kind. They get an email alert at once.</DialogDescription>
          </DialogHeader>
          {rules.length > 0 && (
            <ul className="grid gap-1 rounded-lg border bg-muted/30 p-3 text-sm">
              {rules.map((rule) => (
                <li key={rule.interest ?? "all"}>
                  <span className="font-medium">{label(rule.interest)}:</span> {rule.userIds.map((id) => workers.find((w) => w.id === id)?.name ?? "former staff").join(", ")}
                </li>
              ))}
            </ul>
          )}
          <Field>
            <FieldLabel htmlFor="rule-interest">For</FieldLabel>
            <Select name="interest" value={interest} onValueChange={setInterest}>
              <SelectTrigger id="rule-interest" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Every kind</SelectItem>
                {Object.entries(leadInterestLabel).map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Take turns</legend>
            {workers.length === 0 && <p className="text-sm text-muted-foreground">No one here works leads yet.</p>}
            {workers.map((worker) => (
              <label key={worker.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="userIds" value={worker.id} defaultChecked={current.includes(worker.id)} className="size-4 accent-primary" />
                {worker.name}
              </label>
            ))}
            <FieldDescription>Untick everyone to remove the list.</FieldDescription>
          </fieldset>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

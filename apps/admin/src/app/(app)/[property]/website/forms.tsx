"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deleteNotice, refreshWebsiteNow, saveNotice, setNoticeActive } from "./actions";

export type NoticeValues = {
  id: string;
  message: string;
  linkLabel: string | null;
  linkUrl: string | null;
  startsOn: string | null;
  endsOn: string | null;
  active: boolean;
};

const longest = 160;

/** Adds a notice, or changes one. */
export function NoticeDialog({ propertyId, notice, first }: { propertyId: string; notice?: NoticeValues; first?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {notice ? (
          <Button variant="outline" size="sm">
            <Pencil />
            Change
          </Button>
        ) : (
          <Button variant={first ? "default" : "outline"}>
            <Plus />
            Add a notice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        {/* The form mounts with the dialog, so a new notice starts empty each time. */}
        <NoticeForm propertyId={propertyId} notice={notice} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function NoticeForm({ propertyId, notice, onDone }: { propertyId: string; notice?: NoticeValues; onDone: () => void }) {
  const [message, setMessage] = useState(notice?.message ?? "");
  const [linkLabel, setLinkLabel] = useState(notice?.linkLabel ?? "");
  const [state, action, pending] = useToastAction(saveNotice.bind(null, propertyId, notice?.id ?? null), onDone);
  const id = (name: string) => `${notice?.id ?? "new-notice"}-${name}`;
  return (
    <form action={action} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{notice ? "Change the notice" : "Add a notice"}</DialogTitle>
        <DialogDescription>A short message on every page of the website, in a small card guests can close.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor={id("message")}>Message</FieldLabel>
          <Textarea
            id={id("message")}
            name="message"
            rows={2}
            required
            minLength={3}
            maxLength={longest}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="The pool is closed for cleaning on 12 November."
          />
          <FieldDescription className="flex justify-between gap-3">
            <span>One or two short sentences.</span>
            <span className="tabular-nums">
              {message.length}/{longest}
            </span>
          </FieldDescription>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={id("link-label")}>Link text</FieldLabel>
            <Input id={id("link-label")} name="linkLabel" maxLength={40} value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="See the rooms" />
          </Field>
          <Field>
            <FieldLabel htmlFor={id("link-url")}>Link to</FieldLabel>
            <Input id={id("link-url")} name="linkUrl" maxLength={300} defaultValue={notice?.linkUrl ?? ""} placeholder="/stays" />
          </Field>
        </div>
        <FieldDescription className="-mt-2">Leave both empty for no link. A page of the website, such as /stays, or a full address.</FieldDescription>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={id("from")}>From</FieldLabel>
            <DateField id={id("from")} name="startsOn" defaultValue={notice?.startsOn ?? undefined} placeholder="Now" />
          </Field>
          <Field>
            <FieldLabel htmlFor={id("to")}>Until</FieldLabel>
            <DateField id={id("to")} name="endsOn" defaultValue={notice?.endsOn ?? undefined} placeholder="No end" />
          </Field>
        </div>
        <FieldDescription className="-mt-2">Both days included. Leave them empty to show it from now until you turn it off.</FieldDescription>
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
          <Label htmlFor={id("active")} className="font-normal">
            On
          </Label>
          <Switch id={id("active")} name="active" defaultChecked={notice?.active ?? true} />
        </div>
        <NoticePreview message={message} linkLabel={linkLabel} />
      </FieldGroup>
      <FormNote state={state} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {notice ? "Save changes" : "Add notice"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Roughly how the card looks on the website. Each site draws it in its own colours and type. */
function NoticePreview({ message, linkLabel }: { message: string; linkLabel: string }) {
  return (
    <div className="grid gap-3 rounded-lg border border-dashed bg-muted/30 p-4" aria-hidden>
      <p className="text-xs font-medium text-muted-foreground">On the website, in the corner of each page</p>
      <div className="flex max-w-[23rem] items-start gap-3 rounded-xl border bg-background py-3 pr-2 pl-4 shadow-[0_18px_40px_-24px_rgb(0_0_0/0.45)]">
        <span className="mt-[0.45rem] size-2 shrink-0 rounded-full bg-primary" />
        <div className="min-w-0 flex-1 text-sm leading-snug">
          <p className={`text-pretty break-words ${message.trim() ? "" : "text-muted-foreground"}`}>{message.trim() || "Your message"}</p>
          {linkLabel.trim() && <span className="mt-1.5 inline-block font-medium underline decoration-border underline-offset-4">{linkLabel.trim()} →</span>}
        </div>
        <span className="flex size-7 shrink-0 items-center justify-center text-muted-foreground">
          <X className="size-4" />
        </span>
      </div>
    </div>
  );
}

/** Turns a notice on or off at once. */
export function NoticeSwitch({ noticeId, active }: { noticeId: string; active: boolean }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await setNoticeActive(noticeId, !active);
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

export function DeleteNoticeButton({ noticeId }: { noticeId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(async () => deleteNotice(noticeId), () => setOpen(false));
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove the notice">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this notice?</AlertDialogTitle>
            <AlertDialogDescription>It goes from the website in a moment. To show it again later, turn it off instead.</AlertDialogDescription>
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

/** Makes the website load what it reads from the admin again, now. */
export function RefreshWebsiteButton({ propertyId, disabled }: { propertyId: string; disabled?: boolean }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={pending || disabled}
      onClick={async () => {
        setPending(true);
        const result = await refreshWebsiteNow(propertyId);
        setPending(false);
        if (result?.error) toast.error(result.error);
        else if (result?.done) toast.success(result.done);
      }}
    >
      {pending ? <Spinner /> : <RefreshCw />}
      Refresh now
    </Button>
  );
}

"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { FormNote, useToastAction } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveTemplate } from "./template-actions";

/** Edits one email's subject and opening text, with the fields it can use. */
export function TemplateDialog({ propertyId, kind, label, when, fields, value }: { propertyId: string; kind: string; label: string; when: string; fields: string[]; value?: { subject: string; body: string; active: boolean } }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(saveTemplate.bind(null, propertyId, kind), () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          {value ? "Change" : "Write"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{when} The booking&apos;s details, the button and the footer are added below your text. Clear both fields to go back to the standard wording.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={`${kind}-subject`}>Subject</FieldLabel>
              <Input id={`${kind}-subject`} name="subject" maxLength={200} defaultValue={value?.subject} placeholder="Leave empty for the standard subject" />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${kind}-body`}>Text at the top</FieldLabel>
              <Textarea id={`${kind}-body`} name="body" rows={6} maxLength={3000} defaultValue={value?.body} placeholder="Dear {{guestName}}, …" />
              <FieldDescription>
                Fields you can use:{" "}
                {fields.map((f) => (
                  <code key={f} className="mr-1 rounded bg-muted px-1 py-0.5 text-xs">{`{{${f}}}`}</code>
                ))}
              </FieldDescription>
            </Field>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${kind}-active`} className="font-normal">
                Use this wording
              </Label>
              <Switch id={`${kind}-active`} name="active" defaultChecked={value?.active ?? true} />
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

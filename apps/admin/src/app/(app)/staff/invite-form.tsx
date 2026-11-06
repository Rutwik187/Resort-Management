"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { FormNote, useToastAction } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { inviteStaff } from "./actions";

/** Adds a person: their Google email, one role, and their resorts (USR-01). */
export function InviteForm({ roles, resorts }: { roles: { id: string; name: string; description: string | null }[]; resorts: { id: string; name: string; code: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useToastAction(inviteStaff, () => setOpen(false));
  const [all, setAll] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Add a person
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form action={action} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add a person</DialogTitle>
            <DialogDescription>They sign in with this Google account. Only people on the staff list can sign in.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" name="name" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Google email</FieldLabel>
                <Input id="email" name="email" type="email" required />
              </Field>
            </div>
            <FieldSet>
              <FieldLegend variant="label">Role</FieldLegend>
              {/* No role is chosen for the person: the Super Admin picks one. */}
              <RadioGroup name="roleId" required className="grid gap-2 sm:grid-cols-2">
                {roles.map((role) => (
                  <Label key={role.id} htmlFor={`role-${role.id}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem id={`role-${role.id}`} value={role.id} className="mt-0.5" />
                    <span className="grid gap-1">
                      <span className="font-medium">{role.name}</span>
                      <span className="text-xs text-muted-foreground">{role.description}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </FieldSet>
            <FieldSet>
              <FieldLegend variant="label">Resorts</FieldLegend>
              <div className="flex items-center gap-3">
                <Switch id="allProperties" name="allProperties" checked={all} onCheckedChange={setAll} />
                <Label htmlFor="allProperties" className="font-normal">
                  All resorts, now and later
                </Label>
              </div>
              {!all && (
                <div className="flex flex-wrap gap-2">
                  {resorts.map((resort) => (
                    <Label key={resort.id} htmlFor={`resort-${resort.id}`} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                      <Checkbox id={`resort-${resort.id}`} name="propertyIds" value={resort.id} />
                      {resort.name}
                    </Label>
                  ))}
                </div>
              )}
              <FieldDescription>Their role applies only at these resorts.</FieldDescription>
            </FieldSet>
          </FieldGroup>
          <FormNote state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Add person
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Building2, Clock3, Save } from "lucide-react";
import { FormNote, useToastAction } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { saveSettings } from "./actions";

type Settings = {
  legalName: string | null;
  gstin: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  checkInTime: string;
  checkOutTime: string;
  holdMinutes: number;
  lowStockThreshold: number;
  advancePercent: number;
  refundApprovalPaise: number | null;
  stateCode: string;
  stateName: string;
};

export function SettingsForm({ propertyId, settings }: { propertyId: string; settings: Settings }) {
  const [state, action, pending] = useToastAction(saveSettings.bind(null, propertyId));
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary ring-1 ring-primary/10 ring-inset">
              <Building2 className="size-4" />
            </span>
            <div className="grid gap-1.5">
              <CardTitle>Company</CardTitle>
              <CardDescription>Each resort is its own company. These go on its invoices.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="legalName">Legal name</FieldLabel>
                <Input id="legalName" name="legalName" defaultValue={settings.legalName ?? ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor="gstin">GSTIN</FieldLabel>
                <Input id="gstin" name="gstin" defaultValue={settings.gstin ?? ""} className="uppercase" placeholder="27AABCU9603R1ZM" />
              </Field>
              <Field>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Textarea id="address" name="address" rows={3} defaultValue={settings.address ?? ""} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                <Field>
                  <FieldLabel htmlFor="stateCode">State code</FieldLabel>
                  <Input id="stateCode" name="stateCode" inputMode="numeric" maxLength={2} required defaultValue={settings.stateCode} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="stateName">State</FieldLabel>
                  <Input id="stateName" name="stateName" required defaultValue={settings.stateName} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" name="email" type="email" defaultValue={settings.email ?? ""} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <Input id="phone" name="phone" type="tel" defaultValue={settings.phone ?? ""} />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardHeader className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary ring-1 ring-primary/10 ring-inset">
              <Clock3 className="size-4" />
            </span>
            <div className="grid gap-1.5">
              <CardTitle>Stays and bookings</CardTitle>
              <CardDescription>Times guests see, and how the booking engine behaves.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="checkInTime">Check-in from</FieldLabel>
                  <Input id="checkInTime" name="checkInTime" type="time" required defaultValue={settings.checkInTime.slice(0, 5)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="checkOutTime">Check-out by</FieldLabel>
                  <Input id="checkOutTime" name="checkOutTime" type="time" required defaultValue={settings.checkOutTime.slice(0, 5)} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="holdMinutes">Hold time, in minutes</FieldLabel>
                <Input id="holdMinutes" name="holdMinutes" type="number" min={1} max={120} required defaultValue={settings.holdMinutes} />
                <FieldDescription>How long a guest&apos;s rooms or seats stay held while they pay (INV-03). After that, they go back on sale.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="lowStockThreshold">Rooms left before an alert</FieldLabel>
                <Input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} max={50} required defaultValue={settings.lowStockThreshold} />
                <FieldDescription>The Today page lists a room type when this many rooms or fewer are left for a night (INV-10).</FieldDescription>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="advancePercent">Paid online to book, in %</FieldLabel>
                  <Input id="advancePercent" name="advancePercent" type="number" min={1} max={100} required defaultValue={settings.advancePercent} />
                  <FieldDescription>100 takes the whole price on the website. Less leaves a balance for a payment link or the desk.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="refundApproval">Refunds without approval, up to ₹</FieldLabel>
                  <Input id="refundApproval" name="refundApproval" inputMode="decimal" placeholder="Every refund needs approval" defaultValue={settings.refundApprovalPaise === null ? "" : settings.refundApprovalPaise / 100} />
                  <FieldDescription>Accounts start refunds up to this amount at once. Larger ones wait for a Super Admin.</FieldDescription>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <FormNote state={state} />
        <p className="mr-auto text-sm text-muted-foreground max-sm:hidden">Changes apply to new bookings at once.</p>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : <Save />}
          Save settings
        </Button>
      </div>
    </form>
  );
}

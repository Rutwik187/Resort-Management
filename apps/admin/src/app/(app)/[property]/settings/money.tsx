import { asc, eq } from "drizzle-orm";
import { CreditCard, Percent, Undo2 } from "lucide-react";
import { cancellationRules, getDb, paymentAccounts, taxRules, type properties } from "@repo/db";
import { maskKey, paymentAccount, rateLabel } from "@repo/engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { longDate, rupees } from "@/lib/format";
import { CancellationRuleDialog, PaymentKeysForm, RemoveRuleButton, TaxRuleDialog } from "./money-forms";

const targetLabel = { room: "Rooms", offering: "Day packages and seats", addon: "Add-ons" } as const;
const scopeLabel = { stay: "Stays", day: "Day visits", any: "Stays and day visits" } as const;

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary ring-1 ring-primary/10 ring-inset">{children}</span>;
}

/** Online payments, GST and cancellation rules for one resort (plan section 9, Settings). */
export async function MoneySettings({ property }: { property: typeof properties.$inferSelect }) {
  const db = getDb();
  const [own] = await db.select().from(paymentAccounts).where(eq(paymentAccounts.propertyId, property.id));
  const account = await paymentAccount(db, property.id).catch(() => null);
  const taxes = await db.select().from(taxRules).where(eq(taxRules.propertyId, property.id)).orderBy(asc(taxRules.appliesTo), asc(taxRules.startsOn), asc(taxRules.minUnitPaise));
  const cancellation = await db.select().from(cancellationRules).where(eq(cancellationRules.propertyId, property.id)).orderBy(asc(cancellationRules.appliesTo), asc(cancellationRules.daysBefore));
  const base = process.env.BETTER_AUTH_URL ?? "https://prathamesh-admin.vercel.app";
  const webhookUrl = `${base.replace(/\/$/, "")}/api/webhooks/razorpay/${property.code}`;

  return (
    <div className="mt-4 grid gap-4">
      <Card className="shadow-xs">
        <CardHeader className="flex items-start gap-3">
          <Icon>
            <CreditCard className="size-4" />
          </Icon>
          <div className="grid gap-1.5">
            <CardTitle>Online payments</CardTitle>
            <CardDescription>
              {property.name}&apos;s own Razorpay account. Guests pay on the website, staff send payment links, and refunds go back the same way.
            </CardDescription>
          </div>
          <CardAction>
            {account ? (
              <Badge variant={account.mode === "live" ? "default" : "secondary"}>{account.mode === "live" ? "Live" : "Test mode"}</Badge>
            ) : (
              <Badge variant="outline">Off: WhatsApp requests</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {account?.source === "env" && (
            <p className="rounded-md border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
              Using the shared test account ({maskKey(account.keyId)}) until this company&apos;s own keys are saved below. Test payments move no money.
            </p>
          )}
          <PaymentKeysForm
            propertyId={property.id}
            saved={own ? { keyId: own.keyId, active: own.active, hasWebhookSecret: Boolean(own.webhookSecret) } : null}
            webhookUrl={webhookUrl}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card className="shadow-xs">
          <CardHeader className="flex items-start gap-3">
            <Icon>
              <Percent className="size-4" />
            </Icon>
            <div className="grid gap-1.5">
              <CardTitle>GST</CardTitle>
              <CardDescription>Rooms are taxed by each room&apos;s price for each night. The newest rule that has started wins. Ask the chartered accountant to confirm these.</CardDescription>
            </div>
            <CardAction>
              <TaxRuleDialog propertyId={property.id} />
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Rule</TableHead>
                  <TableHead>Price band</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead className="pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No GST rules. Bookings show &ldquo;to confirm&rdquo; until one is added.
                    </TableCell>
                  </TableRow>
                )}
                {taxes.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="pl-6">
                      <div className="font-medium">{rule.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {targetLabel[rule.appliesTo]}
                        {rule.sac ? ` · SAC ${rule.sac}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {rule.maxUnitPaise === null ? (rule.minUnitPaise ? `Above ${rupees(rule.minUnitPaise - 1)}` : "Any price") : `${rupees(rule.minUnitPaise)} to ${rupees(rule.maxUnitPaise)}`}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{rateLabel(rule.rateBps)}</TableCell>
                    <TableCell className="text-sm">{longDate(rule.startsOn)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <RemoveRuleButton propertyId={property.id} ruleId={rule.id} kind="tax" label={rule.label} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex items-start gap-3">
            <Icon>
              <Undo2 className="size-4" />
            </Icon>
            <div className="grid gap-1.5">
              <CardTitle>Cancellation rules</CardTitle>
              <CardDescription>What a guest gets back for cancelling that many days or more before arrival. Staff see it as a suggestion and decide.</CardDescription>
            </div>
            <CardAction>
              <CancellationRuleDialog propertyId={property.id} />
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">For</TableHead>
                  <TableHead>Cancelled</TableHead>
                  <TableHead className="text-right">Back</TableHead>
                  <TableHead className="pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancellation.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No rules. Staff decide each refund.
                    </TableCell>
                  </TableRow>
                )}
                {cancellation.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="pl-6 text-sm">{scopeLabel[rule.appliesTo]}</TableCell>
                    <TableCell className="text-sm">{rule.daysBefore === 0 ? "Any time" : `${rule.daysBefore}+ days before`}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{rule.refundPercent}%</TableCell>
                    <TableCell className="pr-6 text-right">
                      <RemoveRuleButton propertyId={property.id} ruleId={rule.id} kind="cancellation" label={`${rule.daysBefore}+ days`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

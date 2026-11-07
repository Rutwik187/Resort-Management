import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { getDb, invoices, onlinePayments, refunds, type bookings } from "@repo/db";
import { loadCancellationRules, paymentAccount, suggestRefund, todayInIndia } from "@repo/engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { longDate, methodLabel, rupees, when } from "@/lib/format";
import { CopyButton, RefundDecision, RefundForm, RetryRefund } from "./money-forms";

type Booking = typeof bookings.$inferSelect;

/** Online payments, links, refunds, invoices and the refund the rules suggest, for one booking. */
export async function loadMoney(booking: Booking) {
  const db = getDb();
  const [online, refundRows, docs, rules, account] = await Promise.all([
    db.select().from(onlinePayments).where(eq(onlinePayments.bookingId, booking.id)).orderBy(desc(onlinePayments.createdAt)),
    db.select().from(refunds).where(eq(refunds.bookingId, booking.id)).orderBy(desc(refunds.createdAt)),
    db.select({ id: invoices.id, kind: invoices.kind, number: invoices.number, issuedOn: invoices.issuedOn, totalPaise: invoices.totalPaise, reason: invoices.reason }).from(invoices).where(eq(invoices.bookingId, booking.id)).orderBy(asc(invoices.createdAt)),
    loadCancellationRules(db, booking.propertyId),
    paymentAccount(db, booking.propertyId).catch(() => null),
  ]);
  const waiting = refundRows.filter((r) => r.status === "requested" || r.status === "processing").reduce((sum, r) => sum + r.amountPaise, 0);
  const suggestion = booking.paidPaise > 0 ? suggestRefund(rules, booking, todayInIndia()) : null;
  return { online, refunds: refundRows, invoices: docs, suggestion, onlinePayments: Boolean(account), refundable: Math.max(0, booking.paidPaise - waiting) };
}

export type Money = Awaited<ReturnType<typeof loadMoney>>;

const refundLook = { requested: "Waiting for approval", processing: "With Razorpay", processed: "Refunded", failed: "Failed", rejected: "Rejected" } as const;

/** Paid online payments, as rows for the Payments table. */
export function OnlinePaymentRows({ money }: { money: Money }) {
  return (
    <>
      {money.online
        .filter((p) => p.status === "paid")
        .map((payment) => (
          <TableRow key={payment.id}>
            <TableCell>{payment.paidAt ? when(payment.paidAt) : ""}</TableCell>
            <TableCell>
              Razorpay{payment.method ? `, ${payment.method}` : ""}
              {payment.mode === "test" && (
                <Badge variant="outline" className="ml-2">
                  Test
                </Badge>
              )}
              <span className="block text-xs text-muted-foreground">
                {payment.via === "link" ? "Payment link" : "Website"} · {payment.paymentId}
              </span>
            </TableCell>
            <TableCell className="hidden text-muted-foreground sm:table-cell">Guest</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{rupees(payment.amountPaise)}</TableCell>
          </TableRow>
        ))}
    </>
  );
}

/** Payment links still waiting, with their address. */
export function WaitingLinks({ money }: { money: Money }) {
  const links = money.online.filter((p) => p.via === "link" && p.status === "created");
  if (links.length === 0) return null;
  return (
    <ul className="grid gap-2">
      {links.map((link) => (
        <li key={link.id} className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-sm">
          <span className="font-medium tabular-nums">{rupees(link.amountPaise)}</span>
          <span className="text-muted-foreground">link sent {when(link.createdAt)}, not paid yet</span>
          {link.linkUrl && (
            <span className="ml-auto flex items-center gap-1">
              <a href={link.linkUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:underline">
                {link.linkUrl.replace(/^https?:\/\//, "")}
              </a>
              <CopyButton value={link.linkUrl} label="Copy the payment link" />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function RefundsCard({ booking, money, may, needsApproval }: { booking: Booking; money: Money; may: { ask: boolean; approve: boolean; retry: boolean }; needsApproval: boolean }) {
  const cancelled = ["cancelled", "no_show"].includes(booking.status);
  if (money.refunds.length === 0 && !(may.ask && booking.paidPaise > 0)) return null;
  const suggested = money.suggestion && cancelled ? Math.min(money.suggestion.amountPaise, money.refundable) : booking.totalPaise !== null && booking.paidPaise > booking.totalPaise ? booking.paidPaise - booking.totalPaise : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Refunds</CardTitle>
        <CardDescription>
          {money.suggestion
            ? `Cancellation rules: ${money.suggestion.rule.toLowerCase()} (${money.suggestion.daysBefore >= 0 ? `${money.suggestion.daysBefore} days before arrival today` : "after arrival"}), ${rupees(money.suggestion.amountPaise)} of ${rupees(booking.paidPaise)} paid.`
            : booking.paidPaise > 0
              ? "This resort has no cancellation rules, so staff decide the refund."
              : booking.refundedPaise > 0
                ? `Everything paid, ${rupees(booking.refundedPaise)}, has gone back to the guest.`
                : "Nothing is paid, so nothing can go back."}
        </CardDescription>
        {may.ask && money.refundable > 0 && (
          <CardAction>
            <RefundForm bookingId={booking.id} suggested={suggested ? String(suggested / 100) : ""} paidOnline={money.online.some((p) => p.status === "paid")} needsApproval={needsApproval} />
          </CardAction>
        )}
      </CardHeader>
      {money.refunds.length > 0 && (
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Asked</TableHead>
                <TableHead>Why</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {money.refunds.map((refund) => (
                <TableRow key={refund.id}>
                  <TableCell className="pl-6 align-top">{when(refund.createdAt)}</TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {refund.reason}
                    <span className="block text-xs text-muted-foreground">
                      {refund.method ? methodLabel[refund.method] : "Razorpay"}
                      {refund.providerRefundId ? ` · ${refund.providerRefundId}` : refund.reference ? ` · ${refund.reference}` : ""}
                    </span>
                    {refund.error && <span className="block text-xs text-destructive">{refund.error}</span>}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="grid justify-items-start gap-2">
                      <Badge variant={refund.status === "processed" ? "default" : refund.status === "failed" || refund.status === "rejected" ? "destructive" : "secondary"}>{refundLook[refund.status]}</Badge>
                      {refund.status === "requested" && may.approve && <RefundDecision refundId={refund.id} />}
                      {refund.status === "failed" && may.retry && <RetryRefund refundId={refund.id} />}
                    </div>
                  </TableCell>
                  <TableCell className="pr-6 text-right align-top font-medium tabular-nums">{rupees(refund.amountPaise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}

export function InvoicesCard({ code, money, booking }: { code: string; money: Money; booking: Booking }) {
  if (money.invoices.length === 0) {
    if (booking.status === "pending_payment" || booking.status === "expired") return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>{booking.totalPaise === null ? "The invoice is issued once the price is set." : "No invoice yet. It is issued when the booking is paid or confirmed."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>GST invoices and credit notes. They are never changed: a new price credits the old invoice and issues a new one.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {money.invoices.map((doc) => (
          <Link key={doc.id} href={`/${code.toLowerCase()}/invoices/${doc.id}`} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/60">
            <FileText className="size-4 text-muted-foreground" />
            <span className="font-mono font-medium">{doc.number}</span>
            <span className="text-muted-foreground">
              {doc.kind === "invoice" ? "Invoice" : "Credit note"}, {longDate(doc.issuedOn)}
            </span>
            <span className={`ml-auto font-medium tabular-nums ${doc.kind === "credit_note" ? "text-destructive" : ""}`}>
              {doc.kind === "credit_note" ? "−" : ""}
              {rupees(doc.totalPaise)}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

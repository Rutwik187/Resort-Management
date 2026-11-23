import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { can } from "@repo/auth";
import { getDb, leadActivities, leads, properties } from "@repo/db";
import { NoAccess } from "@/components/no-access";
import { Button } from "@/components/ui/button";
import { longDate, rupees } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { PrintButton } from "../../../../bookings/[number]/forms";

export const metadata = { title: "Quotation" };

type Quotation = { lines: { title: string; quantity: number; ratePaise: number }[]; subtotalPaise: number; gstPercent: number; validUntil: string | null; notes: string | null };

/** A lead's quotation in the resort's name, ready to print or save as a PDF (CRM-09). */
export default async function QuotationPage({ params }: PageProps<"/[property]/leads/[id]/quote/[quote]">) {
  const staff = await requireStaffPage();
  const { property: code, id, quote } = await params;
  const property = await propertyFromCode(code, staff);
  if (!can(staff, "leads.view", property.id)) return <NoAccess what="leads" />;
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^\d{1,18}$/.test(quote)) notFound();
  const db = getDb();
  const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.propertyId, property.id)));
  if (!lead) notFound();
  const [activity] = await db.select().from(leadActivities).where(and(eq(leadActivities.id, Number(quote)), eq(leadActivities.leadId, id), eq(leadActivities.type, "quotation")));
  if (!activity) notFound();
  const [company] = await db.select().from(properties).where(eq(properties.id, property.id));
  const q = activity.data as Quotation;
  const gst = Math.round((q.subtotalPaise * q.gstPercent) / 100);
  const issued = activity.at.toISOString().slice(0, 10);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" asChild>
          <Link href={`/${property.code.toLowerCase()}/leads/${lead.id}`}>
            <ArrowLeft />
            {lead.name}&apos;s lead
          </Link>
        </Button>
        <PrintButton />
      </div>
      <article className="mx-auto w-full max-w-3xl rounded-lg border bg-white p-8 text-[#1c1917] shadow-xs print:border-0 print:p-0 print:shadow-none sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[#1f4d36] uppercase">Quotation</p>
            <h1 className="mt-1 text-2xl font-semibold">{company.name}</h1>
            <p className="mt-1 text-sm text-[#57534e]">
              {[company.legalName, company.address].filter(Boolean).join(", ")}
              {company.gstin && <span className="block">GSTIN {company.gstin}</span>}
              {[company.phone ? `+${company.phone}` : null, company.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <dl className="grid gap-1 text-right text-sm">
            <div>
              <dt className="inline text-[#57534e]">Number </dt>
              <dd className="inline font-medium">Q-{property.code}-{activity.id}</dd>
            </div>
            <div>
              <dt className="inline text-[#57534e]">Date </dt>
              <dd className="inline">{longDate(issued)}</dd>
            </div>
            {q.validUntil && (
              <div>
                <dt className="inline text-[#57534e]">Valid until </dt>
                <dd className="inline">{longDate(q.validUntil)}</dd>
              </div>
            )}
          </dl>
        </header>
        <section className="grid gap-1 py-6 text-sm">
          <p className="text-[#57534e]">For</p>
          <p className="text-base font-medium">{lead.name}</p>
          {lead.details?.Company && <p>{lead.details.Company}</p>}
          <p className="text-[#57534e]">{[lead.phone ? `+${lead.phone}` : null, lead.email].filter(Boolean).join(" · ")}</p>
          {lead.dateFrom && (
            <p className="text-[#57534e]">
              {lead.dateTo ? `${longDate(lead.dateFrom)} to ${longDate(lead.dateTo)}` : longDate(lead.dateFrom)}
              {lead.guests ? `, ${lead.guests} guests` : ""}
            </p>
          )}
        </section>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y text-left text-[#57534e]">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {q.lines.map((line, i) => (
              <tr key={i} className="border-b">
                <td className="py-2 pr-4">{line.title}</td>
                <td className="py-2 text-right tabular-nums">{line.quantity}</td>
                <td className="py-2 text-right tabular-nums">{rupees(line.ratePaise)}</td>
                <td className="py-2 text-right tabular-nums">{rupees(line.ratePaise * line.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 text-right text-[#57534e]">
                Before GST
              </td>
              <td className="pt-3 text-right tabular-nums">{rupees(q.subtotalPaise)}</td>
            </tr>
            {q.gstPercent > 0 && (
              <tr>
                <td colSpan={3} className="pt-1 text-right text-[#57534e]">
                  GST at {q.gstPercent}%
                </td>
                <td className="pt-1 text-right tabular-nums">{rupees(gst)}</td>
              </tr>
            )}
            <tr className="text-base font-semibold">
              <td colSpan={3} className="pt-2 text-right">
                Total
              </td>
              <td className="pt-2 text-right tabular-nums">{rupees(q.subtotalPaise + gst)}</td>
            </tr>
          </tfoot>
        </table>
        {q.notes && <p className="mt-8 rounded-md bg-[#f5f5f4] p-4 text-sm whitespace-pre-wrap">{q.notes}</p>}
        <p className="mt-8 text-xs text-[#78716c]">This is a quotation, not a tax invoice. GST is worked out on the final booking at the rate in force then.{q.validUntil ? " Prices hold until the date above." : ""}</p>
      </article>
    </div>
  );
}

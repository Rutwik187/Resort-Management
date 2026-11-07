import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { can } from "@repo/auth";
import { bookings, getDb, invoices } from "@repo/db";
import { InvoiceDocument } from "@repo/website/invoice";
import { NoAccess } from "@/components/no-access";
import { Button } from "@/components/ui/button";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { PrintButton } from "../../bookings/[number]/forms";

export const metadata = { title: "Invoice" };

/** One GST invoice or credit note, ready to print or save as a PDF (PR-07). */
export default async function InvoicePage({ params }: PageProps<"/[property]/invoices/[id]">) {
  const staff = await requireStaffPage();
  const { property: code, id } = await params;
  const property = await propertyFromCode(code, staff);
  if (!can(staff, "bookings.view", property.id)) return <NoAccess what="invoices" />;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.propertyId, property.id)));
  if (!invoice) notFound();
  const [booking] = await db.select({ number: bookings.number }).from(bookings).where(eq(bookings.id, invoice.bookingId));
  const [against] = invoice.invoiceId ? await db.select({ number: invoices.number }).from(invoices).where(eq(invoices.id, invoice.invoiceId)) : [];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" asChild>
          <Link href={`/${property.code.toLowerCase()}/bookings/${booking.number.toLowerCase()}`}>
            <ArrowLeft />
            Booking {booking.number}
          </Link>
        </Button>
        <PrintButton />
      </div>
      <InvoiceDocument invoice={{ ...invoice, bookingNumber: booking.number, againstNumber: against?.number ?? null }} />
    </div>
  );
}

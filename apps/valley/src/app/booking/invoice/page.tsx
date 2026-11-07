import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestInvoicePage } from "@repo/website/booking-page";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

/** A GST invoice or credit note from the guest's booking, at /booking/invoice?ref=<link token>&id=<invoice>. */
export default function InvoicePage({ searchParams }: PageProps<"/booking/invoice">) {
  return (
    <Suspense>
      <Invoice searchParams={searchParams} />
    </Suspense>
  );
}

async function Invoice({ searchParams }: { searchParams: PageProps<"/booking/invoice">["searchParams"] }) {
  const { ref, id } = await searchParams;
  if (typeof ref !== "string" || typeof id !== "string") notFound();
  return <GuestInvoicePage code="PV" token={ref} invoiceId={id} />;
}

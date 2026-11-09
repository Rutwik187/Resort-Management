import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestBookingPage } from "@repo/website/booking-page";
import { checkBooking, confirmPayment, payBalance } from "@/app/actions";
import { desk } from "@/content/booking";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

/**
 * The guest's private booking page, at /booking?ref=<link token>: status, price with GST, payments,
 * invoices, and paying the balance. The token rides in the query, so the page's path stays fixed.
 */
export default function BookingPage({ searchParams }: PageProps<"/booking">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-5 pb-24 pt-28 text-bk-muted md:pt-36">Loading your booking…</p>}>
      <Booking searchParams={searchParams} />
    </Suspense>
  );
}

async function Booking({ searchParams }: { searchParams: PageProps<"/booking">["searchParams"] }) {
  const ref = (await searchParams).ref;
  if (typeof ref !== "string") notFound();
  return <GuestBookingPage code="GC" token={ref} actions={{ pay: payBalance.bind(null, ref), confirm: confirmPayment, check: checkBooking.bind(null, ref) }} contact={desk} />;
}

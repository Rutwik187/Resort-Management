import Link from "next/link";
import { StayPlanner } from "@repo/booking-ui";
import { desk, stayGroups, stayNotes } from "@/content/booking";
import { contact } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";
import { SectionLabel } from "@/components/section-label";

export const metadata = pageMetadata({
  title: "Cottages and rates",
  description:
    "Book a laterite cottage at Bhilar, Mahabaleshwar: an AC cottage, one with a jacuzzi or one with a bath tub, or a package with every meal. Choose your dates, add cottages and see the price.",
  path: "/stays",
});

export default function StaysPage() {
  return (
    <PageTransition>
      <div className="bg-mist">
        <header className="mx-auto max-w-[1600px] px-5 pt-28 md:px-10 md:pt-40">
          <SectionLabel className="text-moss">Book a stay</SectionLabel>
          <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-end">
            <h1 className="text-[clamp(2.8rem,5.4vw,5.4rem)] lg:col-span-6">
              Cottages and <em>rates</em>
            </h1>
            <p className="max-w-xl text-moss lg:col-span-6">
              Every cottage is built in lal chira, the red laterite stone of the Konkan. Choose your dates, add a cottage and say
              who stays in it, or choose a package with every meal included. Our team confirms on WhatsApp.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-10 md:px-10 md:pb-32">
          <StayPlanner groups={stayGroups} desk={desk} storageKey="pv" path="/stays" notes={stayNotes} />
          <p className="mt-16 max-w-2xl text-[0.95rem] text-moss">
            Planning a wedding, an event or an offsite?{" "}
            <Link href="/celebrations" className="text-ink underline underline-offset-4">
              See weddings and events
            </Link>
            , or call{" "}
            <a href={contact.phone.href} className="tabular-nums text-ink underline underline-offset-4">
              {contact.phone.display}
            </a>
            .
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

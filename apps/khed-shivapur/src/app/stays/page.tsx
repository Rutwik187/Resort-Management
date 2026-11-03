import Link from "next/link";
import { StayPlanner } from "@repo/booking-ui";
import { desk, stayGroups, stayNotes } from "@/content/booking";
import { contact, stays } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Rooms and rates",
  description:
    "Book a stay near Khed Shivapur, Pune: riverside glass houses with balcony jacuzzis, a private-pool villa, river view tents and laterite stone cottages. Choose your dates, add rooms and see the price.",
  path: "/stays",
});

export default function StaysPage() {
  return (
    <PageTransition>
      <div className="bg-paper">
        <header className="mx-auto max-w-[1680px] px-5 pt-28 md:px-10 md:pt-36">
          <p className="label text-fern">Book a stay</p>
          <div className="mt-5 grid gap-6 lg:grid-cols-12 lg:items-end">
            <h1 className="text-[clamp(2.8rem,5.4vw,5.4rem)] lg:col-span-6">
              Rooms and <em>rates</em>
            </h1>
            <p className="max-w-xl text-fern lg:col-span-6">
              {stays.length} ways to stay, from glass houses on stilts to a private-pool villa. Choose your dates, add a room and
              say who stays in it, then add as many more as you need. Our team confirms on WhatsApp.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1680px] px-5 pb-24 pt-10 md:px-10 md:pb-32">
          <StayPlanner groups={stayGroups} desk={desk} storageKey="ks" path="/stays" notes={stayNotes} />

          <p className="mt-16 max-w-2xl text-[0.95rem] text-fern">
            Planning a wedding, an event or a stay for a large group?{" "}
            <Link href="/celebrations" className="link-line text-forest">
              See weddings and events
            </Link>
            , or call{" "}
            <a href={contact.bookingPhone.href} className="link-line tabular-nums text-forest">
              {contact.bookingPhone.display}
            </a>
            .
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

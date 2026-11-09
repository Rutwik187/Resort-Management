import Link from "next/link";
import { DayPlanner } from "@repo/booking-ui";
import { liveDayPasses, liveNotes } from "@repo/website";
import { sendBookingRequest } from "@/app/actions";
import { onlineBooking } from "@/app/online";
import { dayNotes, dayPasses, desk } from "@/content/booking";
import { pageMetadata } from "@/content/site";
import { DayTimeline } from "@/components/day-timeline";
import { InView, RiseLines } from "@/components/in-view";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Day packages",
  description:
    "A day out near Pune, with meals and more than 80 activities included: morning, afternoon, evening and full-day packages at Prathamesh Resorts, Khed Shivapur. Choose your date and book.",
  path: "/day-packages",
});

export default async function DayPackagesPage() {
  // Day packages and prices from the admin; the site's own content if the database is out of reach.
  const notes = await liveNotes("KS", "day", dayNotes);
  const online = await onlineBooking("day");
  const live = await liveDayPasses("KS", dayPasses);
  return (
    <PageTransition>
      <div className="bg-paper">
        <header className="mx-auto max-w-[1680px] px-5 pt-28 md:px-10 md:pt-36">
          <p className="label text-fern">Book a day visit</p>
          <div className="mt-5 grid gap-6 lg:grid-cols-12 lg:items-end">
            <h1 className="text-[clamp(2.8rem,5.4vw,5.4rem)] lg:col-span-6">
              Day <em>packages</em>
            </h1>
            <p className="max-w-xl text-fern lg:col-span-6">
              Four ways to spend a day here, each with meals and every activity included.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1680px] px-5 pb-24 pt-10 md:px-10">
          <DayPlanner passes={live} onRequest={sendBookingRequest} desk={desk} storageKey="ks" noun="day package" notes={notes} online={online} />
        </div>
      </div>

      <section aria-labelledby="timeline-title" className="bg-linen">
        <div className="mx-auto grid max-w-[1680px] gap-14 px-5 py-24 md:px-10 md:py-32 lg:grid-cols-12 lg:gap-10">
          <InView className="lg:col-span-4">
            <h2 id="timeline-title" className="text-[clamp(2.6rem,5vw,5rem)]">
              <RiseLines lines={["How they fit", "the day"]} />
            </h2>
            <p className="fade mt-8 max-w-sm text-fern">
              Meals are cooked fresh, with pure-veg and non-veg food from separate kitchens. See what there is to do on the{" "}
              <Link href="/experiences" className="link-line text-forest">
                activities page
              </Link>
              .
            </p>
          </InView>
          <div className="lg:col-span-8">
            <DayTimeline detailed />
          </div>
        </div>
      </section>
    </PageTransition>
  );
}

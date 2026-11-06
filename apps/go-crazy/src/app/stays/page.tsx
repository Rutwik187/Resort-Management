import Link from "next/link";
import { StayPlanner } from "@repo/booking-ui";
import { liveStayGroups } from "@repo/website";
import { sendBookingRequest } from "@/app/actions";
import { desk, stayGroups, stayNotes } from "@/content/booking";
import { contact } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Cottages and villas",
  description:
    "Stay the night at Prathamesh Go Crazy, Sinhagad, Pune: laterite stone chira cottages, painted cottages, cottages for couples and villas for groups. Choose your dates, add rooms and see the price.",
  path: "/stays",
});

export default async function StaysPage() {
  // Rooms, rates and text from the admin; the site's own content if the database is out of reach.
  const groups = await liveStayGroups("GC", stayGroups);
  return (
    <PageTransition>
      <div className="bg-chalk">
        <header className="mx-auto max-w-[1600px] px-4 pt-28 md:px-8 md:pt-36">
          <p className="label marker marker-brick">Book a stay</p>
          <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-end">
            <h1 className="text-[clamp(3.6rem,8vw,7.6rem)] lg:col-span-6">Stay the night</h1>
            <p className="max-w-xl text-stone lg:col-span-6">
              Laterite stone cottages under the palms, painted cottages, cottages for couples and villas for groups. Every stay
              includes the activities and the games.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-10 md:px-8 md:pb-28">
          <StayPlanner groups={groups} onRequest={sendBookingRequest} desk={desk} storageKey="gc" path="/stays" notes={stayNotes} />
          <p className="mt-16 max-w-2xl text-[0.95rem] text-stone">
            Here for the day instead?{" "}
            <Link href="/day-packages" className="text-ink underline underline-offset-4">
              See day passes
            </Link>
            . Bringing a school?{" "}
            <Link href="/schools" className="text-ink underline underline-offset-4">
              See school trips
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

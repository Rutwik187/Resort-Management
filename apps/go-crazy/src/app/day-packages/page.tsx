import Link from "next/link";
import { CourseList } from "@/components/course-list";
import { InView, SnapLines } from "@/components/in-view";
import { MealGrid } from "@/components/meal-grid";
import { OfferStamp } from "@/components/offer-stamp";
import { PageTransition } from "@/components/page-transition";
import { PaidList } from "@/components/paid-list";
import { DayPlanner } from "@repo/booking-ui";
import { dayNotes, desk, passes } from "@/content/booking";
import { groundCourse } from "@/content/resort";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({
  title: "Day passes",
  description:
    "Book a morning, afternoon, evening or full-day pass at Prathamesh Go Crazy, Sinhagad, Pune, from ₹1,200 an adult with meals, games and the adventure course included. Choose your date and see the price.",
  path: "/day-packages",
});

export default function DayPackagesPage() {
  return (
    <PageTransition>
      <div className="bg-chalk">
        <header className="mx-auto max-w-[1600px] px-4 pt-28 md:px-8 md:pt-36">
          <p className="label marker marker-brick">Book a day visit</p>
          <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-end">
            <h1 className="text-[clamp(3.6rem,8vw,7.6rem)] lg:col-span-5">Day passes</h1>
            <p className="max-w-xl text-stone lg:col-span-5">
              Come in the morning, after lunch or for the evening. Every pass includes the games, the adventure course and
              the meals for your hours.
            </p>
            <OfferStamp className="lg:col-span-2 lg:justify-self-end" />
          </div>
        </header>
        <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-10 md:px-8 md:pb-28">
          <DayPlanner passes={passes} desk={desk} storageKey="gc" noun="day pass" notes={dayNotes} />
        </div>
      </div>

      <section aria-labelledby="meals-title" className="bg-chalk">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <p className="up label marker marker-brick">Meal times</p>
            <h2 id="meals-title" className="mt-6 text-[clamp(3.2rem,7vw,6.4rem)]">
              <SnapLines lines={["Meals,", "on the dot"]} />
            </h2>
            <p className="up mt-6 max-w-sm text-stone" style={{ "--i": 2 } as React.CSSProperties}>
              Meals are served at set times, from separate veg and non-veg kitchens and dining halls. Please don&apos;t
              ask for a meal after its time.
            </p>
          </div>
          <MealGrid className="up lg:col-span-8 lg:pt-4" />
        </InView>
      </section>

      <section aria-labelledby="included-title" data-tone="dark" className="bg-pine text-chalk">
        <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
          <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="up label marker marker-lime">Included in every pass</p>
              <h2 id="included-title" className="mt-6 text-[clamp(3.2rem,7vw,6.4rem)]">
                <SnapLines lines={["The adventure", "course"]} />
              </h2>
            </div>
            <p className="up text-mist lg:col-span-5" style={{ "--i": 2 } as React.CSSProperties}>
              {groundCourse.length} rope, net, tyre and log challenges, plus the pool, the indoor games and the play
              area. Our team guides you through each activity.
            </p>
          </InView>
          <InView amount={0.05} className="mt-12">
            <CourseList />
          </InView>
        </div>
      </section>

      <section aria-labelledby="paid-title" className="bg-chalk">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="up label marker marker-brick">Not included</p>
            <h2 id="paid-title" className="mt-6 text-[clamp(3.2rem,7vw,6.4rem)]">
              <SnapLines lines={["Paid at", "the ride"]} />
            </h2>
            <p className="up mt-6 max-w-sm text-stone" style={{ "--i": 2 } as React.CSSProperties}>
              These rides are paid for on the spot, at the ride, and are not part of any pass. Outside food, alcohol and
              smoking are not allowed in the park, and only swimwear is allowed in the pools.
            </p>
            <Link href="/policies" className="up link-line mt-6" style={{ "--i": 3 } as React.CSSProperties}>
              Park rules and policies
            </Link>
          </div>
          <PaidList className="up lg:col-span-6 lg:col-start-7" />
        </InView>
      </section>

    </PageTransition>
  );
}

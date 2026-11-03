import Link from "next/link";
import { CourseList } from "@/components/course-list";
import { EnquiryForm } from "@/components/enquiry-form";
import { InView, SnapLines } from "@/components/in-view";
import { MealGrid } from "@/components/meal-grid";
import { OfferStamp } from "@/components/offer-stamp";
import { PageIntro } from "@/components/page-intro";
import { PageTransition } from "@/components/page-transition";
import { PaidList } from "@/components/paid-list";
import { PassTicket } from "@/components/pass-ticket";
import { currentOffer, dayPasses, formatRupees, groundCourse } from "@/content/resort";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({
  title: "Day passes",
  description:
    "Morning, afternoon, evening and full-day passes at Prathamesh Go Crazy, Sinhagad, Pune, from ₹1,200 an adult with meals, games and the adventure course included. Meal times, child rates and paid activities.",
  path: "/day-packages",
});

const fromPrice = formatRupees(Math.min(...dayPasses.map((p) => p.adult)));

export default function DayPackagesPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Day passes"
        lines={["Day", "passes"]}
        photo={{ name: "pool", alt: "The main pool, its tiled deck painted in bright patterns, with the hills beyond the trees" }}
        facts={[
          { label: "Passes", value: String(dayPasses.length) },
          { label: "An adult, from", value: fromPrice },
          { label: "Earliest in", value: "9:00 am" },
          { label: "Latest out", value: "10:30 pm" },
        ]}
      >
        <p>
          Come in the morning, after lunch or for the evening. Every pass includes the games, the adventure course and
          the meals for your hours, cooked fresh in separate veg and non-veg kitchens.
        </p>
      </PageIntro>

      <section aria-labelledby="tickets-title" className="bg-bone">
        <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-24">
          <InView className="flex flex-wrap items-end justify-between gap-8">
            <h2 id="tickets-title" className="min-w-[16rem] flex-1 text-[clamp(3.2rem,7vw,6.4rem)]">
              <SnapLines lines={["Four passes"]} />
            </h2>
            <OfferStamp className="up" />
          </InView>
          {currentOffer && <p className="mt-6 max-w-xl text-stone">{currentOffer.note}</p>}
          <InView as="ol" amount={0.1} className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {dayPasses.map((pass, i) => (
              <li key={pass.id} className="up" style={{ "--i": i } as React.CSSProperties}>
                <PassTicket pass={pass} index={i} className="h-full" />
              </li>
            ))}
          </InView>
          <p className="mt-8 text-[0.92rem] text-stone">All prices per person, plus GST.</p>
        </div>
      </section>

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

      <section id="enquire" aria-labelledby="estimate-title" className="scroll-mt-16 border-y-2 border-ink bg-lime">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-24 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="up label marker">Estimate</p>
            <h2 id="estimate-title" className="mt-6 text-[clamp(3.2rem,7vw,6.4rem)]">
              <SnapLines lines={["Work out", "your day"]} />
            </h2>
            <p className="up mt-6 max-w-sm" style={{ "--i": 2 } as React.CSSProperties}>
              Choose a pass and say how many are coming. The estimate goes into your WhatsApp message, and our team
              confirms the final amount with GST.
            </p>
          </div>
          <div className="up rounded-[6px] bg-chalk p-6 shadow-[0_0_0_2px_var(--color-ink)] md:p-9 lg:col-span-7" style={{ "--i": 1 } as React.CSSProperties}>
            <EnquiryForm defaultPurpose="day" />
          </div>
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

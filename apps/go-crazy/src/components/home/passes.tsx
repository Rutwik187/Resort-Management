import Link from "next/link";
import { currentOffer, dayPasses } from "@/content/resort";
import { InView, SnapLines } from "../in-view";
import { OfferStamp } from "../offer-stamp";
import { PassTicket } from "../pass-ticket";

/** The four day passes, laid out like a book of tickets on a dark table. */
export function Passes() {
  return (
    <section data-tone="dark" aria-labelledby="passes-title" className="overflow-hidden bg-pine text-chalk">
      <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <InView className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="up label marker marker-lime">Day passes</p>
            <h2 id="passes-title" className="mt-6 text-[clamp(3.8rem,11vw,10.5rem)]">
              <SnapLines lines={["Pick a pass,", "come for", "the day"]} />
            </h2>
          </div>
          <div className="flex items-end justify-between gap-8 lg:col-span-5">
            <p className="up max-w-sm text-mist" style={{ "--i": 2 } as React.CSSProperties}>
              Every pass includes the games, the adventure course and meals, cooked fresh in separate veg and non-veg
              kitchens. A few rides are paid for at the ride.
            </p>
            <OfferStamp className="up hidden md:flex" />
          </div>
        </InView>

        <InView amount={0.1} className="mt-14 md:mt-16">
          <ol className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 xl:grid-cols-4">
            {dayPasses.map((pass, i) => (
              <li key={pass.id} className="up w-[82vw] max-w-[360px] shrink-0 snap-start md:w-auto md:max-w-none" style={{ "--i": i } as React.CSSProperties}>
                <PassTicket pass={pass} index={i} className="h-full" />
              </li>
            ))}
          </ol>
        </InView>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-chalk/20 pt-6">
          <p className="text-[0.95rem] text-mist">
            Prices per person, plus GST.{" "}
            {currentOffer && (
              <span className="text-chalk md:hidden">
                {currentOffer.title}. {currentOffer.note}
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="#enquire" data-purpose="day" className="btn btn-lime">
              Work out the cost <span aria-hidden className="arrow">→</span>
            </a>
            <Link href="/day-packages" className="link-line">
              Meal times and what is included
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { formatRupees, schoolDayRates, schoolItinerary } from "@/content/resort";
import { InView, SnapLines } from "../in-view";
import { Photo } from "../photo";

const fromRate = formatRupees(Math.min(...schoolDayRates.map((r) => r.price)));

export function SchoolsTeaser() {
  return (
    <section data-tone="dark" aria-labelledby="schools-title" className="overflow-hidden bg-ink text-chalk">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
        <InView className="lg:col-span-6">
          <p className="up label marker marker-lime">School trips</p>
          <h2 id="schools-title" className="mt-6 text-[clamp(3.8rem,10vw,9.5rem)]">
            <SnapLines lines={["School trips,", "9 am to 3 pm"]} />
          </h2>
          <p className="up mt-7 max-w-lg text-mist" style={{ "--i": 2 } as React.CSSProperties}>
            More than 35 mini adventures, breakfast and lunch, then a DJ and the rain dance before the buses leave. A
            magic show and tattoo making for the pre-primary and primary classes.
          </p>

          <dl className="up mt-10 grid grid-cols-2 border-y border-chalk/25" style={{ "--i": 3 } as React.CSSProperties}>
            <div className="py-5 pr-4">
              <dt className="label text-mist">From</dt>
              <dd className="mt-1.5">
                <span className="figure text-[3rem]">{fromRate}</span>
                <span className="ml-2 text-[0.9rem] text-mist">a student, plus tax</span>
              </dd>
            </div>
            <div className="border-l border-chalk/25 py-5 pl-5">
              <dt className="label text-mist">Teachers</dt>
              <dd className="mt-1.5 text-[1.02rem] leading-snug">One free with every 25 students</dd>
            </div>
          </dl>

          <div className="up mt-9 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ "--i": 4 } as React.CSSProperties}>
            <a href="#enquire" data-purpose="school" className="btn btn-lime">
              Plan a school trip <span aria-hidden className="arrow">→</span>
            </a>
            <Link href="/schools" className="link-line">
              Rates by class, menu and terms
            </Link>
          </div>
        </InView>

        <InView amount={0.15} className="grid content-start gap-3 lg:col-span-5 lg:col-start-8">
          <div className="wipe">
            <Photo
              name="schoolWash"
              alt="Students in school uniform washing their hands at a row of steel basins before lunch"
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="aspect-[4/3] rounded-[6px]"
            />
          </div>
          <ol className="mt-2 grid gap-px overflow-hidden rounded-[6px] bg-chalk/15 text-[0.95rem]">
            {schoolItinerary.map((step, i) => (
              <li key={step.time} className="up flex items-baseline gap-5 bg-ink px-1 py-2.5" style={{ "--i": i } as React.CSSProperties}>
                <span className="figure w-[5.2rem] shrink-0 text-[1.35rem] text-lime">{step.time}</span>
                <span>{step.what}</span>
              </li>
            ))}
          </ol>
        </InView>
      </div>
    </section>
  );
}

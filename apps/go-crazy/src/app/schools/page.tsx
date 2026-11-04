import { CourseList } from "@/components/course-list";
import { Enquiry } from "@/components/enquiry";
import { InView, SnapLines } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { PageTransition } from "@/components/page-transition";
import { PaidList } from "@/components/paid-list";
import { Photo } from "@/components/photo";
import {
  formatRupees,
  schoolDayRates,
  schoolDressCode,
  schoolItinerary,
  schoolMenu,
  schoolOvernightMenu,
  schoolOvernightRates,
  schoolTerms,
} from "@/content/resort";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({
  title: "School trips",
  description:
    "School and college picnics at Prathamesh Go Crazy near Sinhagad, Pune: a 9 am to 3 pm day with breakfast, lunch, 35+ mini adventures and a rain dance, from ₹450 a student. Rates by class, menu, dress code and overnight trips.",
  path: "/schools",
});

const fromRate = formatRupees(Math.min(...schoolDayRates.map((r) => r.price)));

function RateRows({ rows }: { rows: { grade: string; price: number }[] }) {
  return (
    <tbody>
      {rows.map((row) => (
        <tr key={row.grade} className="border-b border-ink/15">
          <th scope="row" className="py-3 pr-4 font-semibold">
            {row.grade}
          </th>
          <td className="figure py-3 text-right text-[1.9rem]">{formatRupees(row.price)}</td>
        </tr>
      ))}
    </tbody>
  );
}

export default function SchoolsPage() {
  return (
    <PageTransition>
      <PageIntro
        label="School trips"
        lines={["School", "trips"]}
        photo={{ name: "dining", alt: "Students at long tables in the dining hall, under red drapes and chandeliers" }}
        facts={[
          { label: "A student, from", value: fromRate },
          { label: "The day", value: "9 to 3" },
          { label: "Mini adventures", value: "35+" },
          { label: "Free teacher per", value: "25" },
        ]}
      >
        <p>
          A full day for nursery classes to senior college: breakfast, a briefing, the adventure course, lunch, then a
          DJ and the rain dance before the buses leave at 3 pm.
        </p>
      </PageIntro>

      <section aria-labelledby="rates-title" className="bg-bone">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="up label marker marker-brick">Day rates</p>
            <h2 id="rates-title" className="mt-6 text-[clamp(3.2rem,7vw,6.4rem)]">
              <SnapLines lines={["By class,", "with food"]} />
            </h2>
            <ul className="up mt-7 grid gap-2.5 text-[0.98rem]" style={{ "--i": 2 } as React.CSSProperties}>
              {[
                "One teacher comes free with every 25 students, and one driver with every 50.",
                "Taxes are charged at actuals.",
                "Transport is not included. We can arrange buses at extra cost.",
                "A magic show and tattoo making are for pre-primary and primary students only.",
                "Please tell us well in advance if you need Jain food.",
              ].map((note) => (
                <li key={note} className="flex gap-3">
                  <span aria-hidden className="mt-[0.55em] size-2 shrink-0 bg-brick" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
          <table className="up w-full self-start text-left lg:col-span-6 lg:col-start-7" style={{ "--i": 1 } as React.CSSProperties}>
            <caption className="sr-only">School day rates by class, with food, plus taxes</caption>
            <thead>
              <tr className="border-b-2 border-ink">
                <th scope="col" className="label py-2.5 font-semibold text-stone">
                  Class
                </th>
                <th scope="col" className="label py-2.5 text-right font-semibold text-stone">
                  Per head
                </th>
              </tr>
            </thead>
            <RateRows rows={schoolDayRates} />
          </table>
        </InView>
      </section>

      <section aria-labelledby="day-title" data-tone="dark" className="bg-ink text-chalk">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="up label marker marker-lime">The day</p>
            <h2 id="day-title" className="mt-6 text-[clamp(3.2rem,7vw,6.4rem)]">
              <SnapLines lines={["Gate at 9,", "bus at 3"]} />
            </h2>
            <div className="wipe mt-10" style={{ "--i": 1 } as React.CSSProperties}>
              <Photo name="schoolWash" alt="Students washing their hands at a row of steel basins before lunch" sizes="(min-width: 1024px) 38vw, 100vw" className="aspect-[4/3] rounded-[6px]" />
            </div>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <ol className="border-t border-chalk/25">
              {schoolItinerary.map((step, i) => (
                <li key={step.time} className="up grid grid-cols-[6.5rem_1fr] items-baseline gap-4 border-b border-chalk/25 py-4" style={{ "--i": i } as React.CSSProperties}>
                  <span className="figure text-[1.9rem] text-lime">{step.time}</span>
                  <span className="text-[1.05rem]">{step.what}</span>
                </li>
              ))}
            </ol>
            <h3 className="up mt-14 text-[2.4rem]">On the menu</h3>
            <dl className="up mt-4 grid gap-4" style={{ "--i": 1 } as React.CSSProperties}>
              {schoolMenu.map((m) => (
                <div key={m.meal} className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                  <dt className="label pt-1 text-mist">{m.meal}</dt>
                  <dd>{m.food}</dd>
                </div>
              ))}
            </dl>
          </div>
        </InView>
      </section>

      <section aria-labelledby="course-title" className="bg-chalk">
        <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
          <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="up label marker marker-brick">General adventure activities</p>
              <h2 id="course-title" className="mt-6 text-[clamp(3.2rem,7vw,6.4rem)]">
                <SnapLines lines={["The course"]} />
              </h2>
            </div>
            <p className="up text-stone lg:col-span-5" style={{ "--i": 2 } as React.CSSProperties}>
              The general adventure activities the park lists for school groups, all part of the day package, with a
              briefing before the first one.
            </p>
          </InView>
          <InView amount={0.05} className="mt-12">
            <CourseList tone="light" />
          </InView>
        </div>
      </section>

      <section id="paid" aria-labelledby="paid-title" className="scroll-mt-20 border-t-2 border-ink bg-bone">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="up label marker marker-brick">Not in the package</p>
            <h2 id="paid-title" className="mt-6 text-[clamp(3.2rem,7vw,6.4rem)]">
              <SnapLines lines={["Paid rides,", "student rates"]} />
            </h2>
            <p className="up mt-6 max-w-sm text-stone" style={{ "--i": 2 } as React.CSSProperties}>
              These are paid separately, at the ride. School groups pay the student rate.
            </p>
          </div>
          <PaidList students className="up lg:col-span-6 lg:col-start-7" />
        </InView>
      </section>

      <section aria-labelledby="overnight-title" data-tone="dark" className="bg-pine text-chalk">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="up label marker marker-lime">Overnight trips</p>
            <h2 id="overnight-title" className="mt-6 text-[clamp(3.2rem,7vw,6.4rem)]">
              <SnapLines lines={["Stay over,", "Monday to Friday"]} />
            </h2>
            <p className="up mt-6 max-w-md text-mist" style={{ "--i": 2 } as React.CSSProperties}>
              One meal cycle, Monday to Friday, here at Go Crazy, at Prathamesh Valley Resorts in Mahabaleshwar or at
              Prathamesh Resorts, Khed Shivapur. Students share rooms with mattresses; teachers share four or five to a
              room.
            </p>
            <dl className="up mt-8 grid gap-4 border-t border-chalk/25 pt-6 text-[0.98rem]" style={{ "--i": 3 } as React.CSSProperties}>
              {schoolOvernightMenu.map((m) => (
                <div key={m.meal} className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                  <dt className="label pt-1 text-mist">{m.meal}</dt>
                  <dd>{m.food}</dd>
                </div>
              ))}
            </dl>
          </div>
          <table className="up w-full self-start text-left lg:col-span-6 lg:col-start-7" style={{ "--i": 1 } as React.CSSProperties}>
            <caption className="sr-only">Overnight school rates by class, plus GST</caption>
            <thead>
              <tr className="border-b-2 border-chalk/60">
                <th scope="col" className="label py-2.5 font-semibold text-mist">
                  Class
                </th>
                <th scope="col" className="label py-2.5 text-right font-semibold text-mist">
                  Per head, plus GST
                </th>
              </tr>
            </thead>
            <tbody>
              {schoolOvernightRates.map((row) => (
                <tr key={row.grade} className="border-b border-chalk/15">
                  <th scope="row" className="py-3 pr-4 font-semibold">
                    {row.grade}
                  </th>
                  <td className="figure py-3 text-right text-[1.9rem]">{formatRupees(row.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </InView>
      </section>

      <section aria-labelledby="terms-title" className="bg-chalk">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <p className="up label marker marker-brick">Before you book</p>
            <h2 id="terms-title" className="mt-6 text-[clamp(3.2rem,7vw,6.4rem)]">
              <SnapLines lines={["Pack and", "plan"]} />
            </h2>
          </div>
          <div className="grid gap-12 md:grid-cols-2 lg:col-span-8">
            <div className="up">
              <h3 className="text-[2.2rem]">Dress code</h3>
              <ul className="mt-4 grid gap-2.5 text-[0.98rem]">
                {schoolDressCode.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden className="mt-[0.55em] size-2 shrink-0 bg-lime shadow-[0_0_0_1px_var(--color-ink)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <h3 className="mt-12 text-[2.2rem]">Payment</h3>
              <p className="mt-4 text-[0.98rem]">
                50% in advance when you book, and the balance on the day at registration, by cash, cheque or RTGS. Tax
                is extra.
              </p>
            </div>
            <div className="up" style={{ "--i": 1 } as React.CSSProperties}>
              <h3 className="text-[2.2rem]">Terms</h3>
              <ol className="mt-4 grid gap-2.5 text-[0.98rem]">
                {schoolTerms.map((term, i) => (
                  <li key={term} className="flex gap-3">
                    <span className="figure w-6 shrink-0 text-[1.1rem] text-brick">{i + 1}</span>
                    {term}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </InView>
      </section>

      <Enquiry defaultPurpose="school" />
    </PageTransition>
  );
}

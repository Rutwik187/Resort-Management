import Link from "next/link";
import { DayTimeline } from "../day-timeline";
import { InView, RiseLines } from "../in-view";

export function DayEscapes() {
  return (
    <section aria-labelledby="day-title" className="bg-paper">
      <div className="mx-auto grid max-w-[1600px] gap-14 px-5 py-24 md:px-10 md:py-40 lg:grid-cols-12 lg:gap-10">
        <InView className="lg:col-span-4">
          <h2 id="day-title" className="text-[clamp(2.8rem,5.6vw,6rem)]">
            <RiseLines lines={["Or come", "for the day"]} />
          </h2>
          <p className="fade mt-8 max-w-sm text-fern">
            Four day packages, each with meals and every activity included. Arrive in the morning, after lunch or for
            the evening, and be home in Pune the same night.
          </p>
          <Link href="/experiences#day" className="fade link-line mt-8" style={{ "--i": 2 } as React.CSSProperties}>
            Day package details
          </Link>
        </InView>
        <div className="lg:col-span-8">
          <DayTimeline />
        </div>
      </div>
    </section>
  );
}

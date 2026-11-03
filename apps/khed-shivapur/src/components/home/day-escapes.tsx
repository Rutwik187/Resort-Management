import Link from "next/link";
import { DayTimeline } from "../day-timeline";
import { InView, RiseLines } from "../in-view";

export function DayEscapes() {
  return (
    <section aria-labelledby="day-title" className="bg-paper">
      <div className="mx-auto grid max-w-[1680px] gap-14 px-5 py-24 md:px-10 md:py-36 lg:grid-cols-12 lg:gap-10">
        <InView className="lg:col-span-4">
          <p className="fade label text-fern">05 · Day packages</p>
          <h2 id="day-title" className="mt-8 text-[clamp(3rem,5.8vw,6.2rem)]">
            <RiseLines lines={["Or come", "for the day"]} />
          </h2>
          <p className="fade mt-8 max-w-sm text-fern" style={{ "--i": 1 } as React.CSSProperties}>
            Four day packages, each with meals and every activity included. Arrive in the morning, after lunch or for
            the evening, and be home in Pune the same night.
          </p>
          <Link href="/experiences#day" className="fade link-line mt-8" style={{ "--i": 2 } as React.CSSProperties}>
            Day package details
          </Link>
        </InView>
        <div className="lg:col-span-8 lg:pt-24">
          <DayTimeline />
        </div>
      </div>
    </section>
  );
}

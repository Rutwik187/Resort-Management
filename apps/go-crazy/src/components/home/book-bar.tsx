import Link from "next/link";
import { DayBar } from "@repo/booking-ui";

/** Straight after the opening films: the date of a day out, then on to the passes. */
export function BookBar() {
  return (
    <section aria-labelledby="book-bar-title" className="relative bg-chalk">
      <div className="mx-auto max-w-[1600px] px-4 pt-12 md:px-8 md:pt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h2 id="book-bar-title" className="label marker marker-brick">
            Book a day out
          </h2>
          <p className="text-[0.95rem] text-stone">
            Staying the night?{" "}
            <Link href="/stays" className="text-ink underline underline-offset-4">
              See cottages and villas
            </Link>
          </p>
        </div>
        <DayBar action="/day-packages" className="mt-4 max-w-3xl" />
      </div>
    </section>
  );
}

import Link from "next/link";
import { InView, Words } from "../in-view";
import { PlaceIndex } from "../place-index";
import { SectionLabel } from "../section-label";

/** Sightseeing with the resort's own guide, as a guidebook index of places. */
export function Explore() {
  return (
    <section aria-labelledby="explore-title" className="bg-cloud">
      <div className="mx-auto grid max-w-[1600px] gap-14 px-5 py-24 md:px-10 md:py-36 lg:grid-cols-12 lg:gap-10">
        <InView className="lg:col-span-4">
          <SectionLabel className="fade text-moss">Explore</SectionLabel>
          <h2 id="explore-title" className="mt-8 text-[clamp(2.8rem,5.6vw,5.8rem)]">
            <Words text="Out with our *guide*" />
          </h2>
          <p className="fade mt-8 max-w-sm text-moss" style={{ "--i": 1 } as React.CSSProperties}>
            The viewpoints, lakes and forts of Mahabaleshwar and Panchgani are all around us. Our in-house guide can plan
            your sightseeing, and we can help you arrange transport.
          </p>
          <Link href="/explore" className="fade arrow-link mt-8" style={{ "--i": 2 } as React.CSSProperties}>
            Places to see, and the seasons
          </Link>
        </InView>
        <InView amount={0.15} className="lg:col-span-7 lg:col-start-6">
          <PlaceIndex className="fade columns-1 gap-x-12 sm:columns-2 [&>li]:break-inside-avoid" />
        </InView>
      </div>
    </section>
  );
}

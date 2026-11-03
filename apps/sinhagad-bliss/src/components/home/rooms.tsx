import Link from "next/link";
import { InView, Lines } from "../in-view";
import { ViewMatrix } from "../view-matrix";

/** The rooms, as the choice a guest actually makes: the view and the pool. */
export function Rooms() {
  return (
    <section aria-labelledby="rooms-title" className="bg-stone">
      <InView amount={0.15} className="mx-auto grid max-w-[1560px] gap-14 px-5 py-24 md:px-10 md:py-36 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <p className="clear kicker text-slate">The rooms</p>
          <h2 id="rooms-title" className="mt-7 text-[clamp(2.8rem,5.4vw,5.4rem)]">
            <Lines lines={["Choose", <>your <em>view</em></>]} start={1} />
          </h2>
          <p className="clear mt-8 max-w-sm text-slate" style={{ "--i": 3 } as React.CSSProperties}>
            The rooms come in four kinds, by two choices: the mountain in view or not, a pool or not. Rooms have a
            private balcony, a television and hot water.
          </p>
          <Link href="/stays" className="clear link-rule mt-8" style={{ "--i": 4 } as React.CSSProperties}>
            Every room and rate
          </Link>
        </div>
        <ViewMatrix className="clear lg:col-span-8 lg:pt-4" />
      </InView>
    </section>
  );
}

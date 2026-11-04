import Link from "next/link";
import { activityGroups, formatRupees, groundCourse, paidActivities } from "@/content/resort";
import { ActivityBoard } from "../activity-board";
import { InView, SnapLines } from "../in-view";

const paidFrom = formatRupees(Math.min(...paidActivities.map((a) => a.price)));
const paidTo = formatRupees(Math.max(...paidActivities.map((a) => a.price)));

export function Board() {
  return (
    <section aria-labelledby="board-title" className="bg-chalk">
      <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="up label marker marker-brick">Activities</p>
            <h2 id="board-title" className="mt-6 text-[clamp(3.8rem,11vw,10.5rem)]">
              <SnapLines lines={["Water, heights", "and aim"]} />
            </h2>
          </div>
          <p className="up text-stone lg:col-span-4" style={{ "--i": 2 } as React.CSSProperties}>
            {activityGroups.length} groups, more than seventy activities. The adventure course alone has{" "}
            {groundCourse.length} rope, net, tyre and log challenges, all included in every pass.
          </p>
        </InView>

        <InView amount={0.1} className="mt-12 md:mt-16">
          <ActivityBoard />
        </InView>

        <InView amount={0.3} className="mt-12 grid gap-6 border-y-2 border-ink py-6 md:mt-16 md:grid-cols-12 md:items-center">
          <p className="up md:col-span-8">
            <span className="label mr-3 inline-block rounded-[3px] bg-sun px-2 py-1 align-middle">Paid at the ride</span>
            Zip line, wall climbing, rappelling, archery, rifle shooting and {paidActivities.length - 5} more, from {paidFrom} to {paidTo} each.
          </p>
          <div className="up flex md:col-span-4 md:justify-end" style={{ "--i": 1 } as React.CSSProperties}>
            <Link href="/activities" className="btn btn-ink">
              Every activity <span aria-hidden className="arrow">→</span>
            </Link>
          </div>
        </InView>
      </div>
    </section>
  );
}

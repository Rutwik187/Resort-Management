import Link from "next/link";
import { DrawnTile } from "@/components/activity-board";
import { CourseList } from "@/components/course-list";
import { Enquiry } from "@/components/enquiry";
import { InView, SnapLines } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { PageTransition } from "@/components/page-transition";
import { PaidList } from "@/components/paid-list";
import { Photo } from "@/components/photo";
import { activityGroups, formatRupees, groundCourse, listLine, paidActivities, poolRules, safetyRules } from "@/content/resort";
import type { PhotoKey } from "@/content/photos";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({
  title: "Activities",
  description:
    "More than 70 activities at Prathamesh Go Crazy near Sinhagad, Pune: a pool with twin slides, rain dance, zip line, high ropes, climbing tower, rappelling, archery, rifle shooting, indoor games and a children's play area.",
  path: "/activities",
});

const alts: Partial<Record<PhotoKey, string>> = {
  slides: "Two yellow water slides running into the main pool",
  pool: "The main pool and its painted deck, with the hills beyond",
  poolGazebo: "A white gazebo reflected in the still pool",
  poolUpright: "The main pool from its edge, under a clear sky",
  poolWide: "The main pool, with trees and the slides behind",
  zipline: "A rider pushing off the zip line platform",
  climb: "A climber halfway up the climbing tower",
  ropesCourse: "A guest in a harness crossing a rope bridge on the high ropes course",
  ropeBridge: "A guest crossing the X log bridge on the ropes course, holding the side ropes",
  rappel: "A guest in a red helmet rappelling down a wall",
  climbTower: "The climbing tower, its panels painted yellow and pink",
  zipRider: "A smiling rider hanging from the zip line pulley",
  ropesTower: "A guest in a harness on the tall ropes tower",
  swings: "Red swings on the lawn of the children's play area",
  merryGoRound: "A yellow merry-go-round in the play area",
  playGate: "The painted arch at the entrance of the play area",
  tyreBridge: "Hanging tyres and a tyre bridge on the adventure course",
};

export default function ActivitiesPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Activities"
        lines={["Seventy", "and more"]}
        strip={[
          { name: "zipline", alt: alts.zipline! },
          { name: "slides", alt: alts.slides! },
          { name: "ropeBridge", alt: alts.ropeBridge! },
        ]}
        facts={[
          { label: "Activities", value: "70+" },
          { label: "On the adventure course", value: String(groundCourse.length) },
          { label: "Groups", value: String(activityGroups.length) },
          { label: "Paid rides, from", value: formatRupees(Math.min(...paidActivities.map((a) => a.price))) },
        ]}
      >
        <p>
          Water, heights, aim, indoor games and a play area for children. The games and the adventure course come with
          every pass and every stay; a few rides are paid for at the ride.
        </p>
      </PageIntro>

      <nav aria-label="Activity groups" className="sticky top-[68px] z-30 border-y-2 border-ink bg-chalk md:top-[78px]">
        <ul className="no-scrollbar mx-auto flex max-w-[1600px] gap-x-7 overflow-x-auto px-4 py-3.5 md:px-8">
          {activityGroups.map((group) => (
            <li key={group.id} className="shrink-0">
              <a href={`#${group.id}`} className="tap text-[0.98rem] font-bold uppercase tracking-[0.05em] [font-stretch:80%] hover:text-brick">
                {group.title}
              </a>
            </li>
          ))}
          <li className="shrink-0">
            <a href="#course" className="tap text-[0.98rem] font-bold uppercase tracking-[0.05em] [font-stretch:80%] hover:text-brick">
              The course
            </a>
          </li>
          <li className="shrink-0">
            <a href="#paid" className="tap text-[0.98rem] font-bold uppercase tracking-[0.05em] [font-stretch:80%] hover:text-brick">
              Paid rides
            </a>
          </li>
        </ul>
      </nav>

      <div className="bg-chalk">
        {activityGroups.map((group, g) => (
          <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="scroll-mt-32 border-b-2 border-ink">
            <InView amount={0.08} className="mx-auto grid max-w-[1600px] gap-10 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-4">
                <p className="up label text-stone">Group {String(g + 1).padStart(2, "0")}</p>
                <h2 id={`${group.id}-title`} className="mt-4 text-[clamp(3.4rem,8vw,7.4rem)]">
                  <SnapLines lines={[group.title]} />
                </h2>
                <p className="up lead mt-5 max-w-sm" style={{ "--i": 1 } as React.CSSProperties}>
                  {group.line}
                </p>
                <p className="up mt-4 text-stone" style={{ "--i": 2 } as React.CSSProperties}>
                  {listLine(group.items)}.
                </p>
              </div>
              <div className="lg:col-span-8">
                {group.gallery.length > 0 ? (
                  <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 xl:grid-cols-4">
                    {group.gallery.map((name, i) => (
                      <div key={name} className="wipe w-[62vw] shrink-0 snap-start md:w-auto" style={{ "--i": i } as React.CSSProperties}>
                        <Photo name={name} alt={alts[name] ?? ""} sizes="(min-width: 1280px) 16vw, (min-width: 768px) 22vw, 62vw" className="aspect-[3/4] rounded-[6px]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="wipe">
                      <DrawnTile id={group.id} className="aspect-[4/5] rounded-[6px]" />
                    </div>
                    <ul className="up grid content-start gap-0 border-t-2 border-ink" style={{ "--i": 1 } as React.CSSProperties}>
                      {group.items.map((item) => (
                        <li key={item} className="display border-b border-ink/15 py-3 text-[clamp(1.8rem,3vw,2.6rem)]">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </InView>
          </section>
        ))}
      </div>

      <section id="course" aria-labelledby="course-title" data-tone="dark" className="scroll-mt-32 bg-pine text-chalk">
        <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
          <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="up label marker marker-lime">Included in every pass</p>
              <h2 id="course-title" className="mt-6 text-[clamp(3.4rem,8vw,7.4rem)]">
                <SnapLines lines={["The adventure", "course"]} />
              </h2>
            </div>
            <p className="up text-mist lg:col-span-5" style={{ "--i": 2 } as React.CSSProperties}>
              Bridges of rope, net, batten and log, tyres to crawl through, a ladder, a ramp and a wire to walk.
            </p>
          </InView>
          <InView amount={0.05} className="mt-12">
            <CourseList />
          </InView>
        </div>
      </section>

      <section id="paid" aria-labelledby="paid-title" className="scroll-mt-32 bg-chalk">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="up label marker marker-brick">Not in any pass</p>
            <h2 id="paid-title" className="mt-6 text-[clamp(3.4rem,8vw,7.4rem)]">
              <SnapLines lines={["Paid at", "the ride"]} />
            </h2>
            <p className="up mt-6 max-w-sm text-stone" style={{ "--i": 2 } as React.CSSProperties}>
              Pay at the ride, on the day. School groups get the student rates on the{" "}
              <Link href="/schools#paid" className="link-line">
                school trips page
              </Link>
              .
            </p>
          </div>
          <PaidList className="up lg:col-span-6 lg:col-start-7" />
        </InView>
      </section>

      <section aria-labelledby="safety-title" className="border-t-2 border-ink bg-bone">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:px-8 md:py-24 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <p className="up label marker marker-brick">Before you go</p>
            <h2 id="safety-title" className="mt-6 text-[clamp(3rem,6vw,5.6rem)]">
              <SnapLines lines={["Safe and", "sound"]} />
            </h2>
          </div>
          <div className="grid gap-10 md:grid-cols-2 lg:col-span-8">
            <div className="up">
              <h3 className="text-[2rem]">On the rides</h3>
              <ul className="mt-4 grid gap-3 text-[0.98rem]">
                {safetyRules.map((rule) => (
                  <li key={rule} className="flex gap-3">
                    <span aria-hidden className="mt-[0.55em] size-2 shrink-0 bg-brick" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div className="up" style={{ "--i": 1 } as React.CSSProperties}>
              <h3 className="text-[2rem]">In the pool</h3>
              <ul className="mt-4 grid gap-3 text-[0.98rem]">
                {poolRules.map((rule) => (
                  <li key={rule} className="flex gap-3">
                    <span aria-hidden className="mt-[0.55em] size-2 shrink-0 bg-brick" />
                    {rule}
                  </li>
                ))}
              </ul>
              <Link href="/policies" className="link-line mt-6">
                All park rules
              </Link>
            </div>
          </div>
        </InView>
      </section>

      <Enquiry defaultPurpose="day" />
    </PageTransition>
  );
}

import Link from "next/link";
import { experienceGroups, listLine } from "@/content/resort";
import type { PhotoKey } from "@/content/photos";
import { pageMetadata } from "@/content/site";
import { Enquiry } from "@/components/enquiry";
import { InView, RiseLines } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { Photo } from "@/components/photo";
import { PageTransition } from "@/components/page-transition";
import { Roll } from "@/components/roll";

export const metadata = pageMetadata({
  title: "Activities",
  description:
    "More than 80 activities near Pune, included with every stay and day package: zip line, ropeway, Burma bridge, high ropes, archery, a waterfall pool and rain dance.",
  path: "/experiences",
});

const alts: Partial<Record<PhotoKey, string>> = {
  poolWaterfall: "The rock waterfall pool with water slides",
  poolPalms: "The main pool lined with palms",
  rainDance: "The covered rain dance floor with sprinklers",
  ropesSky: "Guests crossing the high ropes course with the hills behind",
  ropesHills: "The rope net on the high ropes course, with the hills beyond the trees",
  zipForest: "A guest on the zip line between the trees",
  burmaBridge: "A wooden Burma bridge strung between the trees",
  ropeway: "A guest on the ropeway above the valley",
  archery: "Arrows in the centre of an archery target",
  chess: "Guests playing chess on a giant board indoors",
  carrom: "Friends around a carrom board",
  billiards: "The pool table in the games room",
  kidsPlay: "Tyre swings and climbing frames in the children's play area",
};

export default function ExperiencesPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Activities"
        lines={["Eighty ways", "to spend a day"]}
        photo="ropesHills"
        alt="The rope net on the high ropes course, with the Sahyadri hills beyond the trees"
      >
        <p>
          Water, heights, aim, games and a play area for children. Every activity is included in every stay and every
          day package.
        </p>
      </PageIntro>

      <section aria-labelledby="day-title" className="border-y border-forest/10 bg-linen">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-x-10 gap-y-6 px-5 py-10 md:px-10">
          <div>
            <h2 id="day-title" className="text-[clamp(1.9rem,3vw,2.8rem)]">
              Here for the day?
            </h2>
            <p className="mt-2 max-w-xl text-fern">Four day packages include every activity on this page, with meals.</p>
          </div>
          <Link href="/day-packages" className="btn btn-forest">
            <Roll>See day packages</Roll>
          </Link>
        </div>
      </section>

      <div className="bg-paper">
        {experienceGroups.map((group) => (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-title`}
            className="scroll-mt-16 border-t border-forest/10"
          >
            <InView amount={0.08} className="mx-auto max-w-[1680px] px-5 py-20 md:px-10 md:py-28">
              <div className="grid gap-6 md:grid-cols-12 md:items-end">
                <h2 id={`${group.id}-title`} className="text-[clamp(2.6rem,5.4vw,5.6rem)] md:col-span-7">
                  <RiseLines lines={[group.title]} />
                </h2>
                <p className="fade text-fern md:col-span-4 md:col-start-9">{listLine(group.items)}</p>
              </div>
              <div className="mt-12 columns-2 gap-3 md:columns-3 [&>*]:mb-3">
                {group.gallery.map((name, i) => (
                  <div key={name} className="unveil break-inside-avoid" style={{ "--i": i } as React.CSSProperties}>
                    <Photo
                      name={name}
                      alt={alts[name] ?? ""}
                      sizes="(min-width: 768px) 32vw, 50vw"
                      className={i % 3 === 0 ? "aspect-[4/5]" : "aspect-[4/3]"}
                    />
                  </div>
                ))}
              </div>
            </InView>
          </section>
        ))}
      </div>

      <Enquiry defaultPurpose="day" />
    </PageTransition>
  );
}

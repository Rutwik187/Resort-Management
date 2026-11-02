import { experienceGroups, listLine } from "@/content/resort";
import type { PhotoKey } from "@/content/photos";
import { DayTimeline } from "@/components/day-timeline";
import { pageMetadata } from "@/content/site";
import { Enquiry } from "@/components/enquiry";
import { InView, RiseLines } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { Photo } from "@/components/photo";

export const metadata = pageMetadata({
  title: "Experiences and day packages",
  description:
    "More than 80 activities near Pune: zip line, ropeway, Burma bridge, high ropes, archery, a waterfall pool and rain dance. Morning, afternoon, evening and full-day packages with meals.",
  path: "/experiences",
});

const alts: Partial<Record<PhotoKey, string>> = {
  poolWaterfall: "The rock waterfall pool with water slides",
  poolPalms: "The main pool lined with palms",
  rainDance: "The covered rain dance floor with sprinklers",
  ropesSky: "Guests crossing the high ropes course with the hills behind",
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
    <>
      <PageIntro
        lines={["Eighty ways", "to spend a day"]}
        photo="ropesSky"
        alt="Guests crossing the high ropes course, with the Sahyadri hills on the horizon"
      >
        <p>
          Water, heights, aim, games and a play area for children. Every activity is included in every stay and every
          day package.
        </p>
      </PageIntro>

      <section id="day" aria-labelledby="day-title" className="scroll-mt-16 bg-paper">
        <div className="mx-auto grid max-w-[1600px] gap-14 px-5 py-24 md:px-10 md:py-32 lg:grid-cols-12 lg:gap-10">
          <InView className="lg:col-span-4">
            <h2 id="day-title" className="text-[clamp(2.6rem,5vw,5rem)]">
              <RiseLines lines={["Day", "packages"]} />
            </h2>
            <p className="fade mt-8 max-w-sm text-fern">
              Choose the part of the day that suits you. Meals are cooked fresh, with pure-veg and non-veg food from
              separate kitchens.
            </p>
            <a href="#enquire" className="fade btn btn-moss mt-8" style={{ "--i": 2 } as React.CSSProperties}>
              Book a day package
            </a>
          </InView>
          <div className="lg:col-span-8">
            <DayTimeline detailed />
          </div>
        </div>
      </section>

      <div className="bg-mist">
        {experienceGroups.map((group) => (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-title`}
            className="scroll-mt-16 border-t border-moss/10"
          >
            <InView amount={0.08} className="mx-auto max-w-[1600px] px-5 py-20 md:px-10 md:py-28">
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
    </>
  );
}

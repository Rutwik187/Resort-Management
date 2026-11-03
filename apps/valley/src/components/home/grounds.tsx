import type { PhotoKey } from "@/content/photos";
import { InView, Words } from "../in-view";
import { Photo } from "../photo";
import { SectionLabel } from "../section-label";

const tiles: { photo: PhotoKey; alt: string; caption: string; frame: string; place: string }[] = [
  {
    photo: "pool",
    alt: "The kidney-shaped pool on chequered paving, a painted mural wall and tall trees beyond",
    caption: "The pool, with its painted wall",
    frame: "aspect-[3/2]",
    place: "md:col-span-7",
  },
  {
    photo: "aerialDusk",
    alt: "The resort from the air at dusk: rows of lit cottages, warm lights along the paths and the blue pool",
    caption: "The cottages at dusk",
    frame: "aspect-[4/5]",
    place: "md:col-span-4 md:col-start-9 md:mt-24",
  },
  {
    photo: "lawn",
    alt: "A wide green lawn between the cottages under a blue sky",
    caption: "The lawn",
    frame: "aspect-[4/3]",
    place: "md:col-span-4 md:-mt-24",
  },
  {
    photo: "playArea",
    alt: "The children's play area with swings, a slide and a merry-go-round beside the dining hall",
    caption: "A play area for the children",
    frame: "aspect-[4/3]",
    place: "md:col-span-4",
  },
  {
    photo: "verandaNight",
    alt: "A cottage veranda at night, lit warm under the eaves, with chairs out front",
    caption: "Evenings on the veranda",
    frame: "aspect-[4/3]",
    place: "md:col-span-4",
  },
];

/** The pool, the lawns, the play area and the evenings, in a loose grid of photographs. */
export function Grounds() {
  return (
    <section aria-labelledby="grounds-title" className="overflow-hidden bg-mist">
      <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-8 md:px-10 md:pb-36">
        <InView className="grid gap-8 border-t border-ink/15 pt-16 lg:grid-cols-12 lg:items-end md:pt-24">
          <div className="lg:col-span-7">
            <SectionLabel className="fade text-moss">Around the cottages</SectionLabel>
            <h2 id="grounds-title" className="mt-8 text-[clamp(2.8rem,6vw,6.2rem)]">
              <Words text="Days by the *pool*, nights on the veranda" />
            </h2>
          </div>
          <p className="fade max-w-sm text-moss lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
            A pool, wide lawns, a play area for the children and more than fifteen indoor games. Every activity and
            amenity comes with your stay.
          </p>
        </InView>

        <div className="mt-16 grid gap-12 md:mt-24 md:grid-cols-12 md:gap-x-8 md:gap-y-14">
          {tiles.map((t, i) => (
            <InView key={t.photo} as="figure" amount={0.15} className={t.place}>
              <div className="lift">
                <Photo name={t.photo} alt={t.alt} sizes="(min-width: 768px) 50vw, 100vw" className={t.frame} />
              </div>
              <figcaption className="fade mt-4 flex items-baseline gap-3 text-[0.95rem]">
                <span className="label tabular-nums text-laterite">{String(i + 1).padStart(2, "0")}</span>
                {t.caption}
              </figcaption>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

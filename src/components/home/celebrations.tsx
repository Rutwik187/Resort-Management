import Link from "next/link";
import { contact, eventTypes, listLine } from "@/content/resort";
import { InView, RiseLines } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";
import { Photo } from "../photo";
import { Roll } from "../roll";

const moments = [
  {
    photo: "weddingHaldiPetals" as const,
    alt: "A bride and groom laughing as family throw yellow petals at their haldi",
    caption: "The haldi",
    frame: "aspect-[3/2]",
    place: "md:col-span-7",
  },
  {
    photo: "weddingHands" as const,
    alt: "A bride and groom holding hands across the antarpat, the cloth held between them",
    caption: "The ceremony",
    frame: "aspect-[4/5]",
    place: "md:col-span-4 md:col-start-9 md:mt-40",
  },
  {
    photo: "weddingNightLawn" as const,
    alt: "Strings of warm lights over the lawn at night, above a dance floor and a lit stage",
    caption: "Evenings on the lawn",
    frame: "aspect-[3/2]",
    place: "md:col-span-6 md:col-start-3 md:-mt-16",
  },
];

export function Celebrations() {
  return (
    <section data-tone="dark" aria-labelledby="celebrations-title" className="overflow-hidden bg-forest text-paper">
      <div className="mx-auto max-w-[1680px] px-5 py-24 md:px-10 md:py-36">
        <InView className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="fade label text-sage">06 · Celebrations</p>
            <h2 id="celebrations-title" className="mt-8 text-[clamp(3.2rem,7.4vw,8.4rem)]">
              <RiseLines lines={["Weddings", "in the valley"]} />
            </h2>
          </div>
          <div className="fade lg:col-span-4" style={{ "--i": 2 } as React.CSSProperties}>
            <p className="text-sage">
              Haldi on the lawn, the ceremony under the trees and a reception that runs late, with rooms for both
              families and a wedding team on call.
            </p>
            <p className="mt-5 text-[0.95rem]">
              Wedding team, call or WhatsApp{" "}
              <a href={contact.weddingPhone.href} className="link-line tabular-nums">
                {contact.weddingPhone.display}
              </a>
            </p>
          </div>
        </InView>

        <InView amount={0.1} className="mt-16 md:mt-24">
          <figure>
            <div className="unveil">
              <ParallaxPhoto
                name="weddingPoolside"
                alt="Wedding chairs dressed in white and marigold lining both sides of a pool, palms and a gazebo beyond"
                sizes="(min-width: 1680px) 1600px, 100vw"
                className="aspect-[4/5] sm:aspect-[16/9]"
                depth={9}
              />
            </div>
            <figcaption className="fade mt-4 flex justify-between gap-6 text-[0.9rem] text-sage">
              <span>A ceremony set by the pool</span>
              <span className="label">Fig. 3</span>
            </figcaption>
          </figure>
        </InView>

        <div className="mt-20 grid gap-14 md:mt-28 md:grid-cols-12 md:gap-x-10 md:gap-y-0">
          {moments.map((m, i) => (
            <InView key={m.caption} as="figure" amount={0.15} className={m.place}>
              <div className="unveil">
                <Photo name={m.photo} alt={m.alt} sizes="(min-width: 768px) 50vw, 100vw" className={m.frame} />
              </div>
              <figcaption className="fade mt-4 flex items-baseline gap-4">
                <span className="label text-sun">0{i + 1}</span>
                <span className="display text-[1.6rem] leading-none">{m.caption}</span>
              </figcaption>
            </InView>
          ))}
        </div>

        <InView amount={0.3} className="mt-24 grid gap-10 border-t border-paper/15 pt-10 md:mt-32 lg:grid-cols-12">
          <div className="fade lg:col-span-5">
            <h3 className="text-[clamp(2rem,3.2vw,3.2rem)]">Offsites and celebrations</h3>
            <p className="mt-4 max-w-md text-sage">
              {listLine(eventTypes.map((e) => e.title.toLowerCase()))}, with an air-conditioned
              banquet hall and catering from our own kitchens.
            </p>
          </div>
          <div className="fade flex flex-wrap items-center gap-x-8 gap-y-4 lg:col-span-6 lg:col-start-7 lg:justify-end" style={{ "--i": 1 } as React.CSSProperties}>
            <Link href="/celebrations#weddings" className="btn btn-sun">
              <Roll>Plan a wedding</Roll>
            </Link>
            <Link href="/celebrations#events" className="link-line">
              Plan an event
            </Link>
          </div>
        </InView>
      </div>
    </section>
  );
}

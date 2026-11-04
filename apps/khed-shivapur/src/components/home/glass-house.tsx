import Link from "next/link";
import { contact, formatRupees, stays } from "@/content/resort";
import { photos } from "@/content/photos";
import { InView, RiseLines } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";
import { Roll } from "../roll";
import { VideoLoop } from "../video-loop";

const glass = stays.find((s) => s.slug === "riverside-glass-house")!;

/** The signature stay, shown the way you first see it: rising through the trees. */
export function GlassHouse() {
  return (
    <section aria-labelledby="glass-title" className="overflow-hidden bg-paper">
      <InView
        amount={0.12}
        className="mx-auto grid max-w-[1680px] gap-16 px-5 py-24 md:px-10 md:py-40 lg:grid-cols-12 lg:items-center lg:gap-10"
      >
        <figure className="relative lg:col-span-6">
          <div className="unveil relative">
            <div className="arch relative aspect-[3/4] overflow-hidden lg:aspect-auto lg:h-[86svh]">
              <VideoLoop
                sources={{ av1: "/video/glass-house.av1.mp4", hevc: "/video/glass-house.hevc.mp4" }}
                poster={photos.glassHouseTrees}
                alt="Glass House cabins with green roofs, raised on stilts among bamboo and palms"
                sizes="(min-width: 1024px) 46vw, 100vw"
              />
            </div>
          </div>
          <div
            className="unveil absolute -bottom-10 right-4 w-[42%] bg-paper p-2 sm:p-3 lg:-bottom-12 lg:right-[-12%] lg:w-[40%]"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            <ParallaxPhoto
              name="glassBalconyView"
              alt="Two chairs and a small table on a Glass House balcony, with trees beyond the railing"
              sizes="(min-width: 1024px) 20vw, 40vw"
              className="aspect-[3/4]"
              depth={10}
            />
          </div>
          <figcaption className="fade mt-5 max-w-[22ch] text-[0.9rem] leading-snug text-fern sm:max-w-[30ch]" style={{ "--i": 2 } as React.CSSProperties}>
            <span className="label mr-3 text-forest">Fig. 2</span>
            Filmed by drone in August 2026.
          </figcaption>
        </figure>

        <div className="pt-6 lg:col-span-5 lg:col-start-8 lg:pt-0">
          <p className="fade label text-fern">03 · The signature stay</p>
          <h2 id="glass-title" className="mt-8 text-[clamp(3rem,5.6vw,6rem)]">
            <RiseLines lines={["The Riverside", "Glass House"]} start={1} />
          </h2>
          <p className="fade lead mt-8 max-w-[24ch] text-sun-deep" style={{ "--i": 1 } as React.CSSProperties}>
            {glass.line}
          </p>
          <p className="fade mt-6 max-w-lg text-fern" style={{ "--i": 2 } as React.CSSProperties}>
            {glass.description}
          </p>
          <dl className="fade mt-10 grid grid-cols-3 gap-4 border-t border-forest/15 pt-6" style={{ "--i": 3 } as React.CSSProperties}>
            <div>
              <dt className="label text-fern">Rooms</dt>
              <dd className="display mt-2 text-[2rem] leading-none">6</dd>
            </div>
            <div>
              <dt className="label text-fern">Guests</dt>
              <dd className="display mt-2 text-[2rem] leading-none">4 to 5</dd>
            </div>
            <div>
              <dt className="label text-fern">Weekdays</dt>
              <dd className="display mt-2 text-[2rem] leading-none">{formatRupees(glass.weekday!.base)}</dd>
            </div>
          </dl>
          <p className="fade mt-4 text-[0.9rem] text-fern" style={{ "--i": 3 } as React.CSSProperties}>
            Per couple, Monday to Thursday, plus GST. Check-in {contact.checkIn}.
          </p>
          <div className="fade mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--i": 4 } as React.CSSProperties}>
            <Link href="/stays#riverside-glass-house" className="btn btn-forest">
              <Roll>Book the Glass House</Roll>
            </Link>
            <a href="#enquire" className="link-line">
              Ask us a question
            </a>
          </div>
        </div>
      </InView>
    </section>
  );
}

import Link from "next/link";
import { contact, formatRupees, stays } from "@/content/resort";
import { InView, RiseLines } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";

const glass = stays.find((s) => s.slug === "riverside-glass-house")!;

export function GlassHouse() {
  return (
    <section aria-labelledby="glass-title" className="overflow-hidden bg-moss text-mist">
      <InView className="mx-auto grid max-w-[1600px] gap-14 px-5 py-24 md:px-10 md:py-40 lg:grid-cols-12 lg:gap-10" amount={0.15}>
        <div className="relative lg:col-span-7">
          <div className="unveil">
            <ParallaxPhoto
              name="glassBalcony"
              alt="A jacuzzi filled with rose petals on a Glass House balcony, open to the trees"
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="aspect-[4/5] sm:aspect-square"
              depth={7}
            />
          </div>
          <div
            className="unveil absolute -bottom-10 right-4 w-[40%] bg-moss p-2 sm:right-[-4%] sm:p-3 lg:-bottom-16 lg:right-[-10%]"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            <ParallaxPhoto
              name="glassDetail"
              alt="Towel swans, rose petals and a breakfast tray on a Glass House bed"
              sizes="(min-width: 1024px) 20vw, 38vw"
              className="aspect-[3/4]"
              depth={12}
            />
          </div>
        </div>

        <div className="flex flex-col justify-center pt-8 lg:col-span-4 lg:col-start-9 lg:pt-0">
          <h2 id="glass-title" className="text-[clamp(2.8rem,5.4vw,5.6rem)]">
            <RiseLines lines={["The Riverside", "Glass House"]} />
          </h2>
          <p className="fade display mt-8 text-[1.6rem] leading-snug text-zari">{glass.line}</p>
          <p className="fade mt-6 text-sage" style={{ "--i": 1 } as React.CSSProperties}>
            {glass.description}
          </p>
          <dl className="fade mt-10 grid grid-cols-3 gap-4 border-t border-sage/20 pt-6" style={{ "--i": 2 } as React.CSSProperties}>
            <div>
              <dt className="text-[0.9rem] text-sage">Rooms</dt>
              <dd className="display mt-1 text-[1.9rem]">6</dd>
            </div>
            <div>
              <dt className="text-[0.9rem] text-sage">Guests</dt>
              <dd className="display mt-1 text-[1.9rem]">4 to 5</dd>
            </div>
            <div>
              <dt className="text-[0.9rem] text-sage">Weekdays from</dt>
              <dd className="display mt-1 text-[1.9rem]">{formatRupees(glass.weekday!.base)}</dd>
            </div>
          </dl>
          <p className="fade mt-3 text-[0.9rem] text-sage" style={{ "--i": 2 } as React.CSSProperties}>
            Per couple, Monday to Thursday, plus GST. Check-in {contact.checkIn}.
          </p>
          <div className="fade mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--i": 3 } as React.CSSProperties}>
            <a href="#enquire" className="btn btn-zari">
              Ask about the Glass House
            </a>
            <Link href="/stays#riverside-glass-house" className="link-line">
              See photos and rates
            </Link>
          </div>
        </div>
      </InView>
    </section>
  );
}

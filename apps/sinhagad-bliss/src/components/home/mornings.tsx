import { contact } from "@/content/resort";
import { InView, Lines } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";
import { Photo } from "../photo";

/** The quiet hours: a balcony, a book, and cloud on the hills. */
export function Mornings() {
  return (
    <section aria-labelledby="mornings-title" className="overflow-hidden bg-mist">
      <InView
        amount={0.12}
        className="mx-auto grid max-w-[1560px] gap-16 px-5 pb-24 md:px-10 md:pb-36 lg:grid-cols-12 lg:items-center lg:gap-10"
      >
        <div className="order-2 lg:order-1 lg:col-span-5">
          <p className="clear kicker text-slate">Mornings</p>
          <h2 id="mornings-title" className="mt-7 text-[clamp(2.6rem,4.2vw,4.4rem)]">
            <Lines lines={["Tea on the balcony,", <>cloud on the <em>hills</em></>]} start={1} />
          </h2>
          <p className="clear mt-8 max-w-sm text-slate" style={{ "--i": 3 } as React.CSSProperties}>
            The rooms open onto private balconies. In the monsoon, the cloud settles on the hills across the valley and
            the morning goes slowly.
          </p>
          <dl className="clear mt-10 grid grid-cols-2 gap-6 border-t border-ink/15 pt-6" style={{ "--i": 4 } as React.CSSProperties}>
            <div>
              <dt className="kicker text-slate">Check-in</dt>
              <dd className="display mt-2 text-[2rem] leading-none">{contact.checkIn}</dd>
            </div>
            <div>
              <dt className="kicker text-slate">Check-out</dt>
              <dd className="display mt-2 text-[2rem] leading-none">{contact.checkOut}</dd>
            </div>
          </dl>
        </div>

        <figure className="relative order-1 lg:order-2 lg:col-span-6 lg:col-start-7">
          <div className="surface">
            <ParallaxPhoto
              name="balconyBook"
              alt="A book and a glass of tea on a balcony table, the hills beyond lost in monsoon cloud"
              sizes="(min-width: 1024px) 46vw, 100vw"
              className="aspect-[4/5]"
              depth={6}
            />
          </div>
          {/* A round detail, like the sun in the logo. */}
          <div
            className="surface absolute -bottom-10 -left-2 w-[38%] max-w-[230px] rounded-full ring-8 ring-mist sm:-left-8 lg:-left-16"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            <Photo name="teaMist" alt="A glass of tea on the balcony rail, cloud filling the valley" sizes="230px" className="aspect-square rounded-full" />
          </div>
          <figcaption className="clear mt-14 text-right text-[0.92rem] text-slate lg:mt-4">On a balcony at the resort, in the monsoon</figcaption>
        </figure>
      </InView>
    </section>
  );
}

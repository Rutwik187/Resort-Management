import { InView, RiseLines } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";

/** Food, told plainly: two kitchens, and which meals come with what. */
export function Kitchens() {
  return (
    <section aria-labelledby="kitchens-title" className="overflow-hidden bg-paper">
      <InView
        amount={0.15}
        className="mx-auto grid max-w-[1680px] gap-14 px-5 py-24 md:px-10 md:py-36 lg:grid-cols-12 lg:items-center lg:gap-10"
      >
        <figure className="lg:col-span-5">
          <div className="unveil">
            <ParallaxPhoto
              name="restaurant"
              alt="The restaurant: marble floor, green upholstered chairs and a wall of windows onto the trees"
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="arch aspect-[4/5]"
              depth={8}
            />
          </div>
          <figcaption className="fade mt-4 text-[0.9rem] text-fern">The restaurant, with windows onto the trees</figcaption>
        </figure>

        <div className="lg:col-span-6 lg:col-start-7">
          <p className="fade label text-fern">07 · Kitchens</p>
          <h2 id="kitchens-title" className="mt-8 text-[clamp(3rem,5.8vw,6.2rem)]">
            <RiseLines lines={["Two kitchens,", "one table"]} />
          </h2>
          <p className="fade lead mt-8 max-w-[28ch]" style={{ "--i": 1 } as React.CSSProperties}>
            Everything is cooked fresh, in two separate kitchens: one pure veg, one non-veg.
          </p>
          <dl className="fade mt-12 grid gap-6 border-t border-forest/15 pt-6 sm:grid-cols-3" style={{ "--i": 2 } as React.CSSProperties}>
            <div>
              <dt className="label text-fern">Weekday stays</dt>
              <dd className="mt-2">Breakfast included</dd>
            </div>
            <div>
              <dt className="label text-fern">Weekend stays</dt>
              <dd className="mt-2">Breakfast and one main meal</dd>
            </div>
            <div>
              <dt className="label text-fern">Day packages</dt>
              <dd className="mt-2">Meals for the hours you are here</dd>
            </div>
          </dl>
        </div>
      </InView>
    </section>
  );
}

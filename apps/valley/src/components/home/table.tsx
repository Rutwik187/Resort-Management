import { InView, Words } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";
import { Photo } from "../photo";
import { SectionLabel } from "../section-label";

const meals = [
  { label: "Cottages, Mon to Thu", value: "Breakfast" },
  { label: "Cottages, Fri and Sat", value: "Breakfast and one main meal" },
  { label: "Couple and group packages", value: "Every meal" },
  { label: "Full board", value: "Breakfast, lunch, hi-tea and dinner" },
];

/** The dining hall and the two kitchens, and which meals come with what. */
export function Table() {
  return (
    <section aria-labelledby="table-title" className="overflow-hidden bg-mist">
      <InView amount={0.12} className="mx-auto grid max-w-[1600px] gap-14 px-5 pb-24 md:px-10 md:pb-36 lg:grid-cols-12 lg:gap-10">
        <div className="relative lg:col-span-7">
          <figure>
            <div className="lift">
              <ParallaxPhoto
                name="diningHall"
                alt="The dining hall: wooden tables and chairs on a marble floor, laterite stone walls and a wall of windows"
                sizes="(min-width: 1024px) 56vw, 100vw"
                className="aspect-[4/3]"
                depth={7}
              />
            </div>
            <figcaption className="fade mt-4 text-[0.9rem] text-moss">The dining hall, in laterite stone and glass.</figcaption>
          </figure>
          <div
            className="lift absolute -bottom-10 right-4 w-[40%] border-[6px] border-mist sm:border-8 lg:-bottom-16 lg:right-[-8%] lg:w-[38%]"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <Photo name="thali" alt="A table laid with rotis, rice, curries, salad and dal" sizes="(min-width: 1024px) 22vw, 40vw" className="aspect-[4/5]" />
          </div>
        </div>

        <div className="pt-10 lg:col-span-4 lg:col-start-9 lg:pt-0">
          <SectionLabel className="fade text-moss">The table</SectionLabel>
          <h2 id="table-title" className="mt-8 text-[clamp(2.8rem,5.4vw,5.6rem)]">
            <Words text="Two kitchens, one *table*" />
          </h2>
          <p className="fade lead mt-8" style={{ "--i": 1 } as React.CSSProperties}>
            Veg and non-veg meals are cooked fresh in separate kitchens, and served in separate dining areas.
          </p>
          <dl className="fade mt-10 border-t border-ink/15 text-[0.95rem]" style={{ "--i": 2 } as React.CSSProperties}>
            {meals.map((m) => (
              <div key={m.label} className="grid grid-cols-2 gap-4 border-b border-ink/10 py-3">
                <dt className="text-moss">{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </InView>
    </section>
  );
}

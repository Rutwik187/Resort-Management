import Image from "next/image";
import { photos } from "@/content/photos";
import { InView } from "../in-view";
import { Lines } from "../lines";
import { Photo } from "../photo";

const plates = [
  { name: "chef" as const, alt: "A chef in black whites plating a dish at the kitchen pass", frame: "aspect-[3/4]" },
  { name: "foodFlame" as const, alt: "Flames leaping from a wok on the stove", frame: "aspect-[3/4] sm:mt-24" },
  { name: "foodOverhead" as const, alt: "A plate of stir-fried greens and spring onion on a stone table, from above", frame: "aspect-[4/3]" },
  { name: "foodService" as const, alt: "Two plates carried out of the dark, one of pasta and one of a grilled dish", frame: "aspect-[3/4] sm:-mt-24" },
];

const meals = [
  { when: "Monday to Thursday", what: "Breakfast with the room (CP)" },
  { when: "Friday and Saturday", what: "Breakfast and one main meal (MAP)" },
  { when: "Group package", what: "Meals included" },
];

/** After sunset: the lit lawns, then dinner from two kitchens. */
export function Evenings() {
  return (
    <section id="dining" data-tone="dark" aria-labelledby="evenings-title" className="scroll-mt-0 overflow-hidden bg-dusk text-mist">
      <InView amount={0.1} className="relative h-[86svh] min-h-[560px]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="drift absolute inset-0">
            <Image
              src={photos.duskPath}
              alt="Lit paths and cottage windows at dusk, seen from the resort’s drone"
              fill
              sizes="100vw"
              quality={75}
              className="object-cover"
            />
          </div>
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-dusk via-dusk/30 to-dusk/40" />
        <div className="relative mx-auto flex h-full max-w-[1560px] flex-col justify-end px-5 pb-16 md:px-10 md:pb-24">
          <p className="clear kicker text-haze">Evenings</p>
          <h2 id="evenings-title" className="mt-7 max-w-4xl text-[clamp(3rem,7vw,7.4rem)]">
            <Lines lines={["When the lamps", <>come <em>on</em></>]} start={1} />
          </h2>
          <p className="clear mt-7 max-w-md text-mist/85" style={{ "--i": 3 } as React.CSSProperties}>
            At dusk the lights along the eaves and the lawn paths come on, and the hills go dark behind them.
          </p>
        </div>
      </InView>

      <div className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-36">
        <InView amount={0.12} className="grid gap-16 lg:grid-cols-12 lg:gap-10" style={{ "--veil": "var(--color-dusk)" } as React.CSSProperties}>
          <div className="lg:col-span-4">
            <p className="clear kicker text-haze">Dining</p>
            <h3 className="mt-7 text-[clamp(2.6rem,4.8vw,4.8rem)]">
              <Lines lines={["Two kitchens,", <>kept <em>apart</em></>]} start={1} />
            </h3>
            <p className="clear lede mt-8 max-w-[24ch] text-mist" style={{ "--i": 3 } as React.CSSProperties}>
              Veg and non-veg meals are cooked in separate kitchens and served in separate dining areas.
            </p>
            <dl className="clear mt-12 border-t border-mist/15" style={{ "--i": 4 } as React.CSSProperties}>
              {meals.map((m) => (
                <div key={m.when} className="flex items-baseline justify-between gap-6 border-b border-mist/15 py-4">
                  <dt className="kicker text-haze">{m.when}</dt>
                  <dd className="text-right text-[0.98rem]">{m.what}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:col-span-7 lg:col-start-6">
            {plates.map((p, i) => (
              <div key={p.name} className="surface" style={{ "--i": i } as React.CSSProperties}>
                <Photo name={p.name} alt={p.alt} sizes="(min-width: 1024px) 28vw, 50vw" className={`${p.frame} bg-dusk-soft`} />
              </div>
            ))}
          </div>
        </InView>
      </div>
    </section>
  );
}

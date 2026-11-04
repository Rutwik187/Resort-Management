import { dayPasses, stays } from "@/content/resort";
import { InView, SnapLines } from "../in-view";
import { Photo } from "../photo";

const facts = [
  { value: "70+", label: "indoor and outdoor activities" },
  { value: String(dayPasses.length), label: "day passes, morning to night" },
  { value: String(stays.length), label: "ways to stay the night" },
  { value: "2 km", label: "to Sinhagad fort" },
];

export function Intro() {
  return (
    <section aria-labelledby="intro-title" className="bg-chalk">
      <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-32">
        <InView amount={0.1}>
          <div className="up flex flex-wrap items-center justify-between gap-4 border-t-2 border-ink pt-4">
            <p className="label marker marker-lime">The park</p>
            <p className="label text-stone">Donje, Ghera Sinhagad · Pune 411025</p>
          </div>

          <div className="mt-12 grid gap-12 md:mt-16 lg:grid-cols-12 lg:gap-10">
            <h2 id="intro-title" className="text-[clamp(3.4rem,10.4vw,10.5rem)] lg:col-span-8">
              <SnapLines lines={["More than", "seventy ways", "to spend a day"]} />
            </h2>
            <div className="lg:col-span-4 lg:pt-3">
              <p className="up lead" style={{ "--i": 2 } as React.CSSProperties}>
                Leave the car at the gate: from the parking, bullock carts take you in.
              </p>
              <p className="up mt-5 text-stone" style={{ "--i": 3 } as React.CSSProperties}>
                Inside there is a pool with twin slides, a high ropes course, a zip line and a climbing tower, indoor
                games, a play area for children and lawns under old trees. Every day pass includes meals and the
                games, with a few rides paid for on the spot. Sinhagad, Khadakwasla and Panshet are all around, and
                the city is within an hour.
              </p>
            </div>
          </div>
        </InView>

        <InView amount={0.15} className="mt-16 grid gap-3 md:mt-24 md:grid-cols-12">
          <figure className="md:col-span-5">
            <div className="wipe">
              <Photo name="bullock" alt="A white bullock on the wet road inside the park, beside a wall painted with bullock carts" sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[4/5] rounded-[6px]" imgClassName="object-[50%_60%]" />
            </div>
            <figcaption className="up mt-3 text-[0.9rem] text-stone">The road in, in the monsoon</figcaption>
          </figure>
          <figure className="md:col-span-7">
            <div className="wipe" style={{ "--i": 1 } as React.CSSProperties}>
              <Photo name="entrance" alt="The park's entrance, with its painted signposts pointing to the pool, the adventure park and the wedding lawns" sizes="(min-width: 768px) 58vw, 100vw" className="aspect-[4/3] rounded-[6px] md:aspect-auto md:h-full md:min-h-[24rem]" />
            </div>
            <figcaption className="up mt-3 text-[0.9rem] text-stone" style={{ "--i": 1 } as React.CSSProperties}>
              The gate, and the signposts that point the way
            </figcaption>
          </figure>
        </InView>

        <InView as="dl" amount={0.2} className="mt-16 grid grid-cols-2 border-b-2 border-ink md:mt-20 lg:grid-cols-4">
          {facts.map((f, i) => (
            <div
              key={f.label}
              className={`up flex flex-col border-t-2 border-ink py-6 ${i % 2 === 1 ? "border-l-2 pl-4 md:pl-6" : ""} ${i === 2 ? "lg:border-l-2 lg:pl-6" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <dt className="order-2 mt-2 max-w-[18ch] text-[0.95rem] leading-snug text-stone">{f.label}</dt>
              <dd className="figure order-1 text-[clamp(3.6rem,7vw,6.6rem)]">{f.value}</dd>
            </div>
          ))}
        </InView>
      </div>
    </section>
  );
}

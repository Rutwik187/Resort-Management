import { roomKinds } from "@/content/resort";
import { InView } from "../in-view";
import { Lines } from "../lines";
import { ParallaxPhoto } from "../parallax-photo";

const facts = [
  { value: String(roomKinds.filter((k) => k.view).reduce((n, k) => n + k.rooms, 0)), label: "rooms with the mountain in view" },
  { value: String(roomKinds.filter((k) => k.pool).reduce((n, k) => n + k.rooms, 0)), label: "rooms with a pool" },
  { value: "2", label: "kitchens, veg and non-veg, kept apart" },
];

export function Intro() {
  return (
    <section aria-labelledby="intro-title" className="bg-mist">
      <div className="mx-auto max-w-[1560px] px-5 pb-24 pt-24 md:px-10 md:pb-36 md:pt-36">
        <InView amount={0.2} className="mx-auto max-w-[62rem] text-center">
          <p className="clear kicker text-slate">Ghera Sinhagad, Pune</p>
          <h2 id="intro-title" className="mt-8 text-[clamp(2.2rem,4.6vw,4.4rem)] leading-[1.08]">
            <Lines
              start={1}
              lines={[
                "Cottages and villas in the foothills of Sinhagad.",
                <>
                  Some rooms open onto the <em>mountain</em>,
                </>,
                <>
                  some onto a <em>pool</em>, and a few onto both.
                </>,
              ]}
            />
          </h2>
        </InView>

        <InView as="dl" amount={0.3} className="mx-auto mt-20 grid max-w-[62rem] gap-10 sm:grid-cols-3 sm:gap-0 md:mt-24">
          {facts.map((f, i) => (
            <div
              key={f.label}
              className={`clear text-center sm:px-8 ${i > 0 ? "sm:border-l sm:border-ink/15" : ""}`}
              style={{ "--i": i + 1 } as React.CSSProperties}
            >
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="display block text-[clamp(3.4rem,5.6vw,5.2rem)] leading-none">{f.value}</span>
                <span className="mx-auto mt-3 block max-w-[18ch] text-[0.95rem] leading-snug text-slate">{f.label}</span>
              </dd>
            </div>
          ))}
        </InView>

        <InView as="figure" amount={0.1} className="mt-24 md:mt-32">
          <div className="surface">
            <ParallaxPhoto
              name="verandaView"
              alt="A cottage veranda with two chairs, looking across the lawn to the other cottages and the hills"
              sizes="(min-width: 1560px) 1480px, 100vw"
              className="aspect-[4/5] sm:aspect-[16/9]"
              depth={6}
            />
          </div>
          <figcaption className="clear mt-4 text-center text-[0.92rem] text-slate">From a cottage veranda, across the lawn</figcaption>
        </InView>
      </div>
    </section>
  );
}

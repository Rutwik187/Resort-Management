import { offers, showOffers } from "@/content/resort";
import { InView } from "./in-view";
import { Lines } from "./lines";

/** The offers on the current site, shown quietly. Switch them off in content/resort.ts. */
export function Offers({ className = "" }: { className?: string }) {
  if (!showOffers) return null;
  return (
    <section aria-labelledby="offers-title" className={`bg-mist ${className}`}>
      <InView amount={0.25} className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-32">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-6">
            <p className="clear kicker text-slate">Offers</p>
            <h2 id="offers-title" className="mt-7 text-[clamp(2.4rem,4.4vw,4.4rem)]">
              <Lines lines={["For honeymooners,", <>families and <em>groups</em></>]} start={1} />
            </h2>
          </div>
          <p className="clear max-w-sm text-slate lg:col-span-4 lg:col-start-9" style={{ "--i": 3 } as React.CSSProperties}>
            Ask for the offer that fits when you enquire, and the team will take it off your stay.
          </p>
        </div>
        <ul className="mt-14 grid border-t border-ink/15 sm:grid-cols-3">
          {offers.map((o, i) => (
            <li
              key={o.id}
              className={`clear border-b border-ink/15 py-8 sm:border-b-0 sm:px-8 sm:py-10 sm:first:pl-0 ${i > 0 ? "sm:border-l" : ""}`}
              style={{ "--i": i + 3 } as React.CSSProperties}
            >
              <p className="kicker text-apricot-deep">{o.label}</p>
              <p className="display mt-4 text-[clamp(3.6rem,6vw,5.6rem)] leading-none tabular-nums">{o.percent}%</p>
              <p className="mt-3 text-slate">{o.line}</p>
            </li>
          ))}
        </ul>
      </InView>
    </section>
  );
}

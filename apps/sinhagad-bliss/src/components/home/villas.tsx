import Link from "next/link";
import { villas } from "@/content/resort";
import { InView } from "../in-view";
import { Lines } from "../lines";
import { Photo } from "../photo";

/** The villas, two of them with a private pool. The site publishes no rates, so the team quotes them. */
export function Villas() {
  return (
    <section aria-labelledby="villas-title" className="bg-mist">
      <div className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-36">
        <InView amount={0.1} className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-10">
          <figure className="lg:col-span-7">
            <div className="surface">
              <Photo
                name="poolPergola"
                alt="A private plunge pool beside a shaded seating area, a painted jungle on the wall behind"
                sizes="(min-width: 1024px) 56vw, 100vw"
                className="aspect-[4/3]"
              />
            </div>
            <figcaption className="clear mt-4 text-[0.92rem] text-slate">A private plunge pool, under a painted wall</figcaption>
          </figure>

          <div className="lg:col-span-4 lg:col-start-9 lg:pb-12">
            <p className="clear kicker text-slate">The villas</p>
            <h2 id="villas-title" className="mt-7 text-[clamp(2.6rem,4.6vw,4.6rem)]">
              <Lines lines={["Villas, two with", <>a pool of their <em>own</em></>]} start={1} />
            </h2>
            <ul className="mt-10 border-t border-ink/15">
              {villas.map((v, i) => (
                <li key={v.name} className="clear border-b border-ink/15 py-4" style={{ "--i": i + 3 } as React.CSSProperties}>
                  <span className="block text-[1.12rem]">{v.name}</span>
                  <span className="block text-[0.95rem] text-slate">{v.detail}</span>
                </li>
              ))}
            </ul>
            <p className="clear mt-6 text-[0.95rem] text-slate" style={{ "--i": 6 } as React.CSSProperties}>
              Villa rates are on request. Tell us your dates and the team will quote them.
            </p>
            <Link href="/stays#villas" className="clear btn btn-ink mt-8" style={{ "--i": 7 } as React.CSSProperties}>
              See villas and book
            </Link>
          </div>
        </InView>
      </div>
    </section>
  );
}

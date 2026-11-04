import { contact } from "@/content/resort";
import { InView } from "../in-view";
import { Lines } from "../lines";
import { Photo } from "../photo";

/*
 * The places on the way, in order, as the site describes them: a resort
 * near Khadakwasla dam, in the foothills below Sinhagad fort, with a cycle
 * route on the way and a hiking route up. The drawing shows the order and
 * the climb, not a map, so it carries no distances.
 */
const stops = [
  { name: "Pune", note: "The city", x: 3.5, y: 84 },
  { name: "Khadakwasla dam", note: "The lake below the hills", x: 38, y: 76 },
  { name: "Sinhagad Bliss", note: "In the foothills", x: 66, y: 62, here: true },
  { name: "Sinhagad fort", note: "On the hill above", x: 93, y: 16 },
];

const legs = [
  { name: "The cycle route", note: "A ride through green country on the way to the resort", x: 22, y: 60 },
  { name: "The hiking route", note: "A hard climb to wide views of the mountains", x: 74, y: 25 },
];

const path = "M42 302 C 240 304, 340 290, 456 274 C 600 254, 690 238, 792 223 C 880 205, 960 140, 1116 58";

export function WayUp() {
  return (
    <section id="find-us" aria-labelledby="way-title" className="scroll-mt-0 overflow-hidden bg-mist">
      <div className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-36">
        <InView className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-6">
            <p className="clear kicker text-slate">Find us</p>
            <h2 id="way-title" className="mt-7 text-[clamp(3rem,6.4vw,6.8rem)]">
              <Lines lines={["The way", <><em>up</em></>]} start={1} />
            </h2>
          </div>
          <p className="clear max-w-md text-slate lg:col-span-4 lg:col-start-9" style={{ "--i": 3 } as React.CSSProperties}>
            The resort sits in the foothills below Sinhagad fort, near Khadakwasla dam. A cycle route runs through green
            country to it, and a hiking route climbs on to the views.
          </p>
        </InView>

        {/* The route, drawn. On phones the same stops read as a list. */}
        <InView as="figure" amount={0.2} className="relative mt-16 hidden md:mt-24 md:block">
          <svg viewBox="0 0 1200 360" className="w-full" aria-hidden>
            {/* Two ridges, far and near, like the hills in the logo. */}
            <path d="M0 360 L0 250 L120 214 L210 236 L330 176 L430 214 L560 150 L700 196 L820 120 L930 150 L1040 40 L1130 84 L1200 66 L1200 360 Z" className="fill-stone" />
            <path d="M0 360 L0 300 L180 282 L300 296 L460 262 L620 284 L760 232 L900 250 L1040 176 L1200 210 L1200 360 Z" className="fill-stone/70" />
            <path d={path} pathLength={1} className="draw stroke-ink" fill="none" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {stops.map((s, i) => (
            <div
              key={s.name}
              className="clear absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${s.x}%`, top: `${s.y}%`, "--i": 2 + i * 2 } as React.CSSProperties}
            >
              <span className={`block rounded-full ${s.here ? "sun size-5" : "size-3 bg-ink"}`} />
              <span className={`absolute left-1/2 w-max -translate-x-1/2 text-center ${s.here ? "top-8" : "top-6"}`}>
                <span className="block text-[1.02rem]">{s.name}</span>
                <span className="block text-[0.85rem] text-slate">{s.note}</span>
              </span>
            </div>
          ))}
          {legs.map((l, i) => (
            <p
              key={l.name}
              className="clear absolute max-w-[15rem] -translate-x-1/2 -translate-y-full text-center"
              style={{ left: `${l.x}%`, top: `${l.y}%`, "--i": 4 + i * 3 } as React.CSSProperties}
            >
              <span className="kicker block text-apricot-deep">{l.name}</span>
              <span className="mt-1 block text-[0.88rem] leading-snug text-slate">{l.note}</span>
            </p>
          ))}
        </InView>

        <InView as="ol" amount={0.2} className="relative mt-14 grid gap-0 border-l border-ink/25 pl-7 md:hidden">
          {stops.map((s, i) => (
            <li key={s.name} className="clear relative pb-8 last:pb-0" style={{ "--i": i } as React.CSSProperties}>
              <span className={`absolute top-1.5 rounded-full ${s.here ? "sun -left-[39px] size-5" : "-left-[34px] size-2.5 bg-ink"}`} />
              <span className="block text-[1.05rem]">{s.name}</span>
              <span className="block text-[0.9rem] text-slate">{s.note}</span>
              {i === 1 && (
                <span className="mt-3 block text-[0.9rem] text-slate">
                  <span className="kicker block text-apricot-deep">{legs[0].name}</span>
                  {legs[0].note}
                </span>
              )}
              {i === 2 && (
                <span className="mt-3 block text-[0.9rem] text-slate">
                  <span className="kicker block text-apricot-deep">{legs[1].name}</span>
                  {legs[1].note}
                </span>
              )}
            </li>
          ))}
        </InView>

        <InView amount={0.15} className="mt-20 grid gap-12 border-t border-ink/15 pt-12 md:mt-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h3 className="clear kicker font-sans text-slate">The address</h3>
            <address className="clear mt-5 text-[1.15rem] not-italic leading-relaxed" style={{ "--i": 1 } as React.CSSProperties}>
              {contact.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <div className="clear mt-8 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--i": 2 } as React.CSSProperties}>
              <a href={contact.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-ink">
                Get directions
              </a>
              <a href={contact.phone.href} className="link-under tabular-nums">
                {contact.phone.display}
              </a>
            </div>
          </div>
          <figure className="lg:col-span-7 lg:col-start-6">
            <div className="surface" style={{ "--i": 1 } as React.CSSProperties}>
              <Photo
                name="cottageHills"
                alt="A cottage on a lawn, the green hills of Sinhagad rising behind it under monsoon cloud"
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="aspect-[16/9]"
                imgClassName="object-[50%_35%]"
              />
            </div>
            <figcaption className="clear mt-4 text-[0.92rem] text-slate">The hills behind the cottages, in the monsoon</figcaption>
          </figure>
        </InView>
      </div>
    </section>
  );
}

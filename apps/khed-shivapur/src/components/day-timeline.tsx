import { dayPackages, formatRupees } from "@/content/resort";
import { InView } from "./in-view";

const DAY_START = 9;
const DAY_END = 22;
const span = DAY_END - DAY_START;
const ticks = [9, 12, 15, 18, 21];
const tickLabel = (h: number) => (h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`);
const pct = (h: number) => `${((h - DAY_START) / span) * 100}%`;

/**
 * The four day packages drawn on one ruler from 9 am to 10 pm, so the
 * difference between them is visible at a glance. Bar colour shows the kitchen.
 */
export function DayTimeline({ detailed = false }: { detailed?: boolean }) {
  return (
    <InView amount={0.2} className="w-full">
      <div className="mb-6 flex flex-wrap gap-x-8 gap-y-2 text-[0.9rem] text-fern">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="h-2.5 w-6 rounded-full bg-sage" />
          Pure veg kitchen
        </span>
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="h-2.5 w-6 rounded-full bg-forest" />
          Veg and non-veg kitchen
        </span>
      </div>

      <div className="relative">
        {/* Hour ruler */}
        <div aria-hidden className="relative ml-0 h-8 md:ml-[25%]">
          {ticks.map((h) => (
            <span
              key={h}
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[0.9rem] text-fern first:translate-x-0"
              style={{ left: pct(h) }}
            >
              {tickLabel(h)}
            </span>
          ))}
        </div>

        {/* Hour gridlines behind the bars */}
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 top-8 md:left-[25%]">
          {ticks.map((h) => (
            <span key={h} className="absolute inset-y-0 w-px bg-forest/10" style={{ left: pct(h) }} />
          ))}
        </div>

        <ol className="relative">

          {dayPackages.map((p, i) => {
            const veg = p.kitchen === "Pure veg";
            return (
              <li key={p.name} className="relative grid gap-3 border-t border-forest/12 py-6 md:grid-cols-4 md:gap-0 md:py-7">
                <div className="flex items-baseline justify-between gap-4 md:block md:pr-8">
                  <h3 className="text-[2.2rem] leading-none">{p.name}</h3>
                  <p className="text-[0.9rem] text-fern md:mt-2">{p.hours}</p>
                </div>
                <div className="relative md:col-span-3">
                  <div className="relative h-14 md:h-16">
                    <div
                      className={`grow-x absolute inset-y-0 flex items-center overflow-hidden rounded-full px-5 ${
                        veg ? "bg-sage text-forest" : "bg-forest text-paper"
                      }`}
                      style={{ left: pct(p.start), width: `calc(${pct(p.end)} - ${pct(p.start)})`, "--i": i } as React.CSSProperties}
                    >
                      <span className="truncate text-[0.9rem]">{p.meals}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[0.95rem]">
                    <span className="display text-[1.7rem]">{formatRupees(p.adult)}</span>
                    <span className="text-fern"> an adult</span>
                    {detailed && (
                      <span className="text-fern">
                        , {formatRupees(p.child5to11)} a child aged 5 to 11, {formatRupees(p.child3to5)} a child aged 3 to 5
                      </span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-6 text-[0.9rem] text-fern">All prices plus GST. Every package includes all games and activities.</p>
    </InView>
  );
}

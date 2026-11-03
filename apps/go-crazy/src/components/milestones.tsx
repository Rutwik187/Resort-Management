import { nearby } from "@/content/resort";

/* Like India's roadside milestones, the coloured top says what kind of place it is. */
const tops = ["bg-sun text-ink", "bg-lime text-ink", "bg-brick text-chalk"];
const kinds = ["Fort", "Dam", "Town"];

/** The stone's top already says "Dam", so the name drops it. */
const name = (place: string) => place.replace(/ Dam$/, "");

/**
 * The distances from the park's gate, drawn as roadside milestones: a white
 * stone with a coloured dome, the place name and the kilometres.
 */
export function Milestones({ className = "" }: { className?: string }) {
  return (
    <div className={`grid gap-10 ${className}`}>
      {nearby.map((group, g) => (
        <div key={group.group}>
          <h3 className="label marker [font-stretch:100%]">{group.group}</h3>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {group.places.map((place, i) => (
              <li key={place.name} className="up" style={{ "--i": g * 4 + i } as React.CSSProperties}>
                <div
                  className="board flex h-full flex-col overflow-hidden rounded-t-[999px] rounded-b-[6px] bg-chalk text-ink [--hinge:bottom]"
                  style={{ "--swing": i % 2 ? "2deg" : "-2deg" } as React.CSSProperties}
                >
                  <span className={`label flex h-[4.2rem] items-end justify-center pb-2 ${tops[g]}`}>{kinds[g]}</span>
                  <span className="flex flex-1 flex-col items-center justify-between gap-2 px-2 pb-4 pt-3 text-center">
                    <span className={`display leading-[0.95] ${name(place.name).length > 10 ? "text-[clamp(1.05rem,1.5vw,1.3rem)]" : "text-[clamp(1.25rem,2vw,1.6rem)]"}`}>
                      {name(place.name)}
                    </span>
                    <span className="figure text-[clamp(2.6rem,4.4vw,3.6rem)]">
                      {place.km}
                      <span className="ml-1 text-[0.45em] font-bold">km</span>
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

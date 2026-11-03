import { contact } from "@/content/resort";
import { InView, RiseLines } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";
import { Roll } from "../roll";
import { ValleyClock } from "../valley-clock";

/** Decimal degrees as degrees, minutes and seconds: 18°17′10″. */
function dms(value: number) {
  const deg = Math.floor(value);
  const minFloat = (value - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  return `${deg}°${String(min).padStart(2, "0")}′${String(sec).padStart(2, "0")}″`;
}

export function Place() {
  const { lat, lng } = contact.geo;
  return (
    <section data-tone="dark" aria-labelledby="place-title" className="relative overflow-hidden bg-night text-paper">
      <div aria-hidden className="absolute inset-0">
        <ParallaxPhoto name="valley" alt="" sizes="100vw" depth={10} className="h-full" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-night/45" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-night/75 via-night/25 to-night/55" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-night/85 to-transparent" />

      <InView className="relative mx-auto flex min-h-[100svh] max-w-[1680px] flex-col justify-between gap-16 px-5 py-24 md:px-10 md:py-32">
        <div className="flex flex-wrap items-baseline justify-between gap-6 border-t border-paper/20 pt-5">
          <p className="fade label text-sage">08 · Find us</p>
          <p className="fade label tabular-nums text-sage">
            {dms(lat)} N · {dms(lng)} E
          </p>
        </div>

        <div className="grid gap-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p lang="mr" aria-hidden className="fade font-marathi text-[clamp(1.6rem,2.4vw,2.3rem)] leading-none text-sun">
              सह्याद्री
            </p>
            <h2 id="place-title" className="mt-6 text-[clamp(3.2rem,7vw,7.6rem)]">
              <RiseLines lines={["At the foot", "of the Sahyadri"]} />
            </h2>
            <p className="fade mt-8 max-w-md text-paper/85" style={{ "--i": 1 } as React.CSSProperties}>
              Near the Khed Shivapur toll, just south of Pune, in the green valley at Salawade. River on one side, the
              hills all around, and nights full of stars.
            </p>
            <div className="fade mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--i": 2 } as React.CSSProperties}>
              <a href={contact.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-sun">
                <Roll>Get directions</Roll>
              </a>
              <a href={contact.reviewsUrl} target="_blank" rel="noreferrer" className="link-line">
                Guest reviews on Google
              </a>
            </div>
          </div>
          <div className="fade lg:col-span-4 lg:col-start-9" style={{ "--i": 3 } as React.CSSProperties}>
            <ValleyClock className="grid gap-5 border-t border-paper/20 pt-6 lg:gap-8" />
            <address className="mt-10 border-t border-paper/20 pt-6 text-[0.95rem] not-italic leading-relaxed text-paper/85">
              {contact.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>
        </div>
      </InView>
    </section>
  );
}

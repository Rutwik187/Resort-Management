import { seasons } from "@/content/resort";
import { InView, Words } from "../in-view";
import { Photo } from "../photo";
import { SectionLabel } from "../section-label";

/** Monsoon, winter and summer in the hills, each with its own reason to come. */
export function Seasons({ headingLevel = "h2" }: { headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <section aria-labelledby="seasons-title" className="bg-mist">
      <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-36">
        <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionLabel className="fade text-moss">Seasons</SectionLabel>
            <Heading id="seasons-title" className="mt-8 text-[clamp(2.8rem,6vw,6.2rem)]">
              <Words text="Three seasons in the *hills*" />
            </Heading>
          </div>
          <p className="fade max-w-sm text-moss lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
            Mahabaleshwar changes with the weather. Each season brings its own reason to come up the ghat.
          </p>
        </InView>

        <InView as="ol" amount={0.1} className="mt-16 grid gap-14 md:mt-24 md:grid-cols-3 md:gap-6 lg:gap-10">
          {seasons.map((s, i) => (
            <li key={s.name} className={i === 1 ? "md:mt-20" : ""}>
              <div className="lift" style={{ "--i": i } as React.CSSProperties}>
                <Photo name={s.photo} alt={s.alt} sizes="(min-width: 768px) 32vw, 100vw" className="aspect-[3/4]" />
              </div>
              <div className="fade mt-6 flex items-baseline justify-between gap-4 border-b border-ink/15 pb-4" style={{ "--i": i } as React.CSSProperties}>
                <h3 className="text-[clamp(1.9rem,2.6vw,2.6rem)] leading-none">{s.name}</h3>
                <p className="label text-moss">{s.months}</p>
              </div>
              <p className="fade mt-4 max-w-[34ch] text-moss" style={{ "--i": i + 1 } as React.CSSProperties}>
                {s.line}
              </p>
            </li>
          ))}
        </InView>
      </div>
    </section>
  );
}

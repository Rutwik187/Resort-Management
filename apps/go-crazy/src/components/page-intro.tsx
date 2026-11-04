import type { ReactNode } from "react";
import type { PhotoKey } from "@/content/photos";
import { InView, SnapLines } from "./in-view";
import { Photo } from "./photo";

type Shot = { name: PhotoKey; alt: string; position?: string };

type PageIntroProps = {
  label: string;
  lines: string[];
  children: ReactNode;
  /** One wide photograph... */
  photo?: Shot;
  /** ...or three upright frames side by side, like the passes on the home page. */
  strip?: [Shot, Shot, Shot];
  /** Facts set in a ruled row under the pictures, such as "From ₹1,200". */
  facts?: { label: string; value: string }[];
};

/**
 * Inner-page opening: a big condensed title and a short lead, then the
 * pictures wiping in, with the page's key facts ruled underneath.
 */
export function PageIntro({ label, lines, children, photo, strip, facts }: PageIntroProps) {
  return (
    <InView as="header" amount={0.05} className="bg-chalk">
      <div className="mx-auto max-w-[1600px] px-4 pb-14 pt-28 md:px-8 md:pb-20 md:pt-36">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="up label marker marker-lime">{label}</p>
            <h1 className="mt-6 text-[clamp(4rem,12.5vw,12.5rem)]">
              <SnapLines lines={lines} />
            </h1>
          </div>
          <div className="up text-[1.08rem] text-stone lg:col-span-4 lg:pb-3" style={{ "--i": 2 } as React.CSSProperties}>
            {children}
          </div>
        </div>

        {photo && (
          <div className="wipe mt-10 md:mt-14" style={{ "--i": 1 } as React.CSSProperties}>
            <Photo
              name={photo.name}
              alt={photo.alt}
              preload
              sizes="(min-width: 1600px) 1540px, 100vw"
              className="aspect-[4/3] rounded-[6px] sm:aspect-[21/9]"
              imgClassName={photo.position ?? "object-center"}
            />
          </div>
        )}

        {strip && (
          <div className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory gap-[6px] overflow-x-auto scroll-px-4 px-4 md:mx-0 md:mt-14 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {strip.map((shot, i) => (
              <div key={shot.name} className="wipe w-[78vw] shrink-0 snap-start md:w-auto" style={{ "--i": 1 + i } as React.CSSProperties}>
                <Photo
                  name={shot.name}
                  alt={shot.alt}
                  preload={i === 0}
                  sizes="(min-width: 768px) 33vw, 78vw"
                  className="aspect-[3/4] rounded-[6px] md:aspect-[4/5]"
                  imgClassName={shot.position ?? "object-center"}
                />
              </div>
            ))}
          </div>
        )}

        {facts && (
          <dl className="mt-8 grid grid-cols-2 border-b-2 border-ink md:grid-cols-4">
            {facts.map((f, i) => (
              <div
                key={f.label}
                className={`up flex flex-col border-t-2 border-ink py-5 ${i % 2 === 1 ? "border-l-2 pl-4" : ""} ${i > 0 ? "md:border-l-2 md:pl-6" : ""}`}
                style={{ "--i": 3 + i } as React.CSSProperties}
              >
                <dt className="label order-2 mt-2 text-stone">{f.label}</dt>
                <dd className="figure order-1 text-[clamp(2.2rem,3.6vw,3.2rem)]">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </InView>
  );
}

import Link from "next/link";
import { contact, cottages } from "@/content/resort";
import { photos } from "@/content/photos";
import { InView, Words } from "../in-view";
import { Money } from "../money";
import { Photo } from "../photo";
import { SectionLabel } from "../section-label";
import { VideoLoop } from "../video-loop";

/** The three cottages side by side, after a walk down the chequered path between them. */
export function Cottages() {
  return (
    <section data-tone="dark" aria-labelledby="cottages-title" className="overflow-hidden bg-ink text-mist [--lift:var(--color-ink)]">
      <div aria-hidden className="checker [--checker-a:var(--color-mist)] [--checker-b:var(--color-ink)] [--size:10px]" />
      <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-36">
        <InView amount={0.12} className="grid gap-14 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-6">
            <SectionLabel className="fade text-haze">The cottages</SectionLabel>
            <h2 id="cottages-title" className="mt-8 text-[clamp(2.8rem,6vw,6.4rem)] [--em-color:var(--color-clay)]">
              <Words text="Red stone, cool *rooms*" />
            </h2>
            <p className="fade lead mt-8 max-w-[30ch] text-mist/90" style={{ "--i": 1 } as React.CSSProperties}>
              Every cottage is built in lal chira, the red laterite stone of the Konkan.
            </p>
            <p className="fade mt-6 max-w-md text-haze" style={{ "--i": 2 } as React.CSSProperties}>
              Air conditioning, a television and hot water in every one, for two to four guests. Choose the classic, or one
              with a jacuzzi or a bath tub of its own. Check-in is at {contact.checkIn}.
            </p>
            <Link href="/stays" className="fade arrow-link mt-8" style={{ "--i": 3 } as React.CSSProperties}>
              Every cottage, with photos and rates
            </Link>
          </div>

          <figure className="lg:col-span-5 lg:col-start-8">
            <div className="lift relative aspect-[4/5] sm:aspect-[3/4]" style={{ "--i": 1 } as React.CSSProperties}>
              <VideoLoop
                sources={{ av1: "/video/walk.av1.mp4", hevc: "/video/walk.hevc.mp4" }}
                poster={photos.walk}
                alt="Flying low down the black and white chequered path between the red laterite cottages"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
            </div>
            <figcaption className="fade mt-4 text-[0.9rem] text-haze" style={{ "--i": 2 } as React.CSSProperties}>
              The chequered path between the cottages, by drone.
            </figcaption>
          </figure>
        </InView>

        <InView as="ul" amount={0.1} className="mt-20 grid gap-14 md:mt-28 md:grid-cols-3 md:gap-6 lg:gap-10">
          {cottages.map((cottage, i) => (
            <li key={cottage.slug}>
              <Link href={`/stays#${cottage.slug}`} className="zoom-on-hover group block">
                <div className="lift" style={{ "--i": i } as React.CSSProperties}>
                  <Photo name={cottage.photos[0]} alt="" sizes="(min-width: 768px) 32vw, 100vw" className="aspect-[4/5]" />
                </div>
                <p className="fade label mt-6 text-clay" style={{ "--i": i } as React.CSSProperties}>
                  {cottage.feature}
                </p>
                <h3 className="fade mt-3 text-[clamp(1.8rem,2.4vw,2.4rem)] leading-tight" style={{ "--i": i } as React.CSSProperties}>
                  {cottage.name}
                </h3>
                <dl
                  className="fade mt-5 grid grid-cols-2 gap-4 border-t border-mist/15 pt-4 text-[0.9rem] text-haze"
                  style={{ "--i": i + 1 } as React.CSSProperties}
                >
                  <div>
                    <dt>Mon to Thu</dt>
                    <dd className="display mt-1 text-[1.7rem] leading-none text-mist">
                      <Money amount={cottage.weekday.base} />
                    </dd>
                  </div>
                  <div>
                    <dt>Fri and Sat</dt>
                    <dd className="display mt-1 text-[1.7rem] leading-none text-mist">
                      <Money amount={cottage.weekend.base} />
                    </dd>
                  </div>
                </dl>
                <p className="fade mt-3 text-[0.85rem] text-haze" style={{ "--i": i + 1 } as React.CSSProperties}>
                  Per couple, plus GST
                </p>
              </Link>
            </li>
          ))}
        </InView>
      </div>
    </section>
  );
}

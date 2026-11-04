import { contact, dms } from "@/content/resort";
import { InView, Words } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";
import { SectionLabel } from "../section-label";

export function FindUs() {
  const { lat, lng } = contact.geo;
  return (
    <section id="find-us" data-tone="film" aria-labelledby="find-us-title" className="relative scroll-mt-0 overflow-hidden bg-night text-mist">
      <div aria-hidden className="absolute inset-0">
        <ParallaxPhoto name="aerialNight" alt="" sizes="100vw" depth={10} className="h-full" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-night/40" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-night/80 via-night/30 to-night/10" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-night/85 to-transparent" />

      <InView className="relative mx-auto flex min-h-[92svh] max-w-[1600px] flex-col justify-between gap-16 px-5 py-24 md:px-10 md:py-32">
        <div className="flex flex-wrap items-baseline justify-between gap-6 border-t border-mist/25 pt-5">
          <SectionLabel className="fade text-haze">Find us</SectionLabel>
          <p className="fade label tabular-nums text-haze">
            {dms(lat)} N · {dms(lng)} E · {contact.elevation}
          </p>
        </div>

        <div className="grid gap-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 id="find-us-title" className="text-[clamp(3rem,6.6vw,7rem)] [--em-color:var(--color-clay)]">
              <Words text="On Bhilar–Kaswand *Road*" />
            </h2>
            <p className="fade mt-8 max-w-md text-mist/85" style={{ "--i": 1 } as React.CSSProperties}>
              Ten minutes&apos; drive from Bhilar, between Panchgani and Mahabaleshwar: a weekend getaway by road from
              Pune or Mumbai.
            </p>
            <div className="fade mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--i": 2 } as React.CSSProperties}>
              <a href={contact.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-mist">
                Get directions <span aria-hidden className="btn-arrow">→</span>
              </a>
              <a href={contact.phone.href} className="arrow-link tabular-nums">
                Call {contact.phone.display}
              </a>
            </div>
          </div>
          <div className="fade lg:col-span-4 lg:col-start-9" style={{ "--i": 3 } as React.CSSProperties}>
            <address className="border-t border-mist/25 pt-6 text-[1.05rem] not-italic leading-relaxed text-mist/90">
              <span className="display mb-2 block text-[1.6rem] leading-tight text-mist">Prathamesh Valley Resorts</span>
              {contact.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <p className="mt-6 text-[0.9rem] text-haze">The resort at night, from the drone.</p>
          </div>
        </div>
      </InView>
    </section>
  );
}

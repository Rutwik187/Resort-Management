import { contact } from "@/content/resort";
import { InView, RiseLines } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";

export function Place() {
  const { lat, lng } = contact.geo;
  return (
    <section aria-labelledby="place-title" className="relative overflow-hidden bg-moss-3 text-mist">
      <div aria-hidden className="absolute inset-0">
        <ParallaxPhoto name="valleyView" alt="" sizes="100vw" depth={10} className="h-full" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-moss-3/90 via-moss-3/55 to-moss-3/10" />
      <InView className="relative mx-auto flex min-h-[90svh] max-w-[1600px] flex-col justify-end px-5 py-24 md:px-10 md:py-32">
        <p className="fade display text-[1.1rem] text-zari">
          {lat.toFixed(3)}° N, {lng.toFixed(3)}° E
        </p>
        <h2 id="place-title" className="mt-6 max-w-3xl text-[clamp(2.8rem,6.4vw,6.8rem)]">
          <RiseLines lines={["At the foot", "of the Sahyadri"]} />
        </h2>
        <p className="fade mt-8 max-w-md text-mist" style={{ "--i": 1 } as React.CSSProperties}>
          Near the Khed Shivapur toll, just south of Pune. Valley views, clean air, sunrise over the hills and nights
          full of stars.
        </p>
        <div className="fade mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--i": 2 } as React.CSSProperties}>
          <a href={contact.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-zari">
            Get directions
          </a>
          <a href={contact.reviewsUrl} target="_blank" rel="noreferrer" className="link-line">
            Read guest reviews on Google
          </a>
        </div>
      </InView>
    </section>
  );
}

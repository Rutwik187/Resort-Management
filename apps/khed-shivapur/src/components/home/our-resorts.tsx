import { otherProperties, type PropertyCode } from "@repo/sites";
import type { PhotoKey } from "@/content/photos";
import { InView, RiseLines } from "../in-view";
import { Photo } from "../photo";

const photos: Record<Exclude<PropertyCode, "KS">, { photo: PhotoKey; alt: string }> = {
  GC: { photo: "resortGoCrazy", alt: "A guest in a red helmet on the zip line, high above the trees at Go Crazy" },
  SB: { photo: "resortSinhagadBliss", alt: "A cottage on a green lawn at Sinhagad Bliss, with the wooded Sinhagad hills behind it" },
  PV: { photo: "resortValley", alt: "The cottages of Prathamesh Valley Resorts among green hills and fields near Mahabaleshwar" },
};

/** The group's other three resorts, each with its own website. */
export function OurResorts() {
  return (
    <section aria-labelledby="resorts-title" className="overflow-hidden bg-linen">
      <div className="mx-auto max-w-[1680px] px-5 py-24 md:px-10 md:py-36">
        <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="fade label text-fern">09 · Our resorts</p>
            <h2 id="resorts-title" className="mt-8 text-[clamp(3rem,6vw,6.4rem)]">
              <RiseLines lines={["Three more", "places to stay"]} />
            </h2>
          </div>
          <p className="fade max-w-md text-fern lg:col-span-5" style={{ "--i": 2 } as React.CSSProperties}>
            Prathamesh Resorts is one of four resorts in the Prathamesh family. Each has its own website, its own rooms and its own
            team to book with.
          </p>
        </InView>

        <div className="mt-14 grid gap-12 md:mt-20 md:grid-cols-3 md:gap-6 lg:gap-10">
          {otherProperties("KS").map((property, i) => {
            const card = photos[property.code as Exclude<PropertyCode, "KS">];
            return (
              <InView key={property.code} as="article" amount={0.15} aria-labelledby={`resort-${property.code}`}>
                <a href={property.url} data-cursor="Visit" className="zoom-on-hover group block">
                  <div className="unveil" style={{ "--i": i } as React.CSSProperties}>
                    <Photo name={card.photo} alt={card.alt} sizes="(min-width: 768px) 30vw, 100vw" className="aspect-[4/5]" />
                  </div>
                  <p className="fade label mt-6 text-fern">{property.place}</p>
                  <h3 id={`resort-${property.code}`} className="fade mt-3 text-[clamp(1.9rem,2.6vw,2.6rem)] leading-tight">
                    {property.name}
                  </h3>
                  <p className="fade mt-3 max-w-[34ch] text-fern">{property.pitch}</p>
                  <span className="fade link-line mt-5 text-[0.95rem]">Visit {new URL(property.url).host}</span>
                </a>
              </InView>
            );
          })}
        </div>
      </div>
    </section>
  );
}

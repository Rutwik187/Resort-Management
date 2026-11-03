import Image from "next/image";
import { contact, dms, placeGroups } from "@/content/resort";
import { photos } from "@/content/photos";
import { pageMetadata } from "@/content/site";
import { Enquiry } from "@/components/enquiry";
import { Seasons } from "@/components/home/seasons";
import { InView, Words } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { PageTransition } from "@/components/page-transition";
import { SectionLabel } from "@/components/section-label";

export const metadata = pageMetadata({
  title: "Explore Mahabaleshwar and Panchgani",
  description:
    "Sightseeing from Bhilar with our in-house guide: Venna Lake, Mapro Garden, Arthur's Seat, Table Land, Pratapgad Fort and more, with help to arrange transport. Monsoon, winter and summer in the hills.",
  path: "/explore",
});

export default function ExplorePage() {
  const { lat, lng } = contact.geo;
  return (
    <PageTransition>
      <PageIntro
        label="Explore"
        title="The hills, with our *guide*"
        photo="aerialTerraces"
        alt="The resort from the air among terraced fields and red earth, at Bhilar"
      >
        <p>
          Mahabaleshwar and Panchgani are all around us, with Bhilar, the village of books, just up the road. Our in-house
          guide can plan your sightseeing, and we can help you arrange transport.
        </p>
      </PageIntro>

      <InView as="figure" amount={0.05} className="bg-mist">
        <div className="no-scrollbar overflow-x-auto md:overflow-visible">
          <div className="lift relative aspect-[3000/870] w-[250vw] md:w-full">
            <Image
              src={photos.panoClouds}
              alt="A drone panorama high above the plateau: clouds drifting at eye level over green hills, terraced fields and a lake in the distance"
              fill
              sizes="(min-width: 768px) 100vw, 250vw"
              className="object-cover"
            />
          </div>
        </div>
        <figcaption className="mx-auto max-w-[1600px] px-5 pt-4 text-[0.9rem] text-moss md:px-10">
          The plateau from high above Bhilar, by drone, with cloud at eye level.
        </figcaption>
      </InView>

      <section aria-labelledby="places-title" className="bg-mist">
        <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-32">
          <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <SectionLabel className="fade text-moss">Places to see</SectionLabel>
              <h2 id="places-title" className="mt-8 text-[clamp(2.8rem,6vw,6.2rem)]">
                <Words text="A guidebook, by *area*" />
              </h2>
            </div>
            <p className="fade max-w-sm text-moss lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
              Tell our guide what you enjoy, viewpoints, lakes, gardens or forts, and how long you have. The day is planned
              around you.
            </p>
          </InView>

          <div className="mt-16 grid gap-x-10 gap-y-14 md:mt-20 md:grid-cols-2 lg:grid-cols-4">
            {placeGroups.map((group, i) => (
              <InView key={group.area} amount={0.25} className="border-t-2 border-ink pt-6">
                <h3 className="fade text-[clamp(1.8rem,2.4vw,2.4rem)]" style={{ "--i": i } as React.CSSProperties}>
                  {group.area}
                </h3>
                <ul className="fade mt-5 text-[1.02rem]" style={{ "--i": i + 1 } as React.CSSProperties}>
                  {group.places.map((place) => (
                    <li key={place} className="border-b border-ink/10 py-2.5">
                      {place}
                    </li>
                  ))}
                </ul>
              </InView>
            ))}
          </div>
        </div>
      </section>

      <Seasons />

      <section data-tone="dark" aria-labelledby="getting-here-title" className="bg-ink text-mist">
        <InView className="mx-auto grid max-w-[1600px] gap-12 px-5 py-24 md:px-10 md:py-32 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <SectionLabel className="fade text-haze">Getting here</SectionLabel>
            <h2 id="getting-here-title" className="mt-8 text-[clamp(2.6rem,5.4vw,5.6rem)] [--em-color:var(--color-clay)]">
              <Words text="By road, up the *ghat*" />
            </h2>
            <p className="fade mt-8 max-w-md text-haze" style={{ "--i": 1 } as React.CSSProperties}>
              We are on Bhilar–Kaswand Road, ten minutes&apos; drive from Bhilar, between Panchgani and Mahabaleshwar. A
              weekend getaway by road from Pune or Mumbai.
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
          <dl className="fade grid gap-6 self-end border-t border-mist/20 pt-6 text-[0.98rem] lg:col-span-4 lg:col-start-9" style={{ "--i": 3 } as React.CSSProperties}>
            <div>
              <dt className="label text-haze">Address</dt>
              <dd className="mt-2">
                {contact.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="label text-haze">Coordinates</dt>
              <dd className="mt-2 tabular-nums">
                {dms(lat)} N, {dms(lng)} E
              </dd>
            </div>
            <div>
              <dt className="label text-haze">Height</dt>
              <dd className="mt-2">{contact.elevation} above sea level</dd>
            </div>
          </dl>
        </InView>
      </section>

      <Enquiry />
    </PageTransition>
  );
}

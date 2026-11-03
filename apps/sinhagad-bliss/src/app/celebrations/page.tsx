import { contact, eventTypes, weddingMoments } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { Enquiry } from "@/components/enquiry";
import { InView, Lines } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { ParallaxPhoto } from "@/components/parallax-photo";
import { Photo } from "@/components/photo";
import { PageTransition } from "@/components/page-transition";
import type { PhotoKey } from "@/content/photos";

const moments: { name: PhotoKey; alt: string; position?: string }[] = [
  { name: "weddingCouple", alt: "A bride and groom face to face under a canopy of white flowers" },
  { name: "haldi", alt: "Family throwing petals over a laughing couple at their haldi", position: "object-[60%_50%]" },
  { name: "floralArch", alt: "A floral arch lit on the lawn at night" },
  { name: "haldiSet", alt: "A haldi stage of marigolds and baskets set over the pool, before the guests arrive" },
];

export const metadata = pageMetadata({
  title: "Weddings and events",
  description:
    "Destination weddings on the lawn or in the banquet hall at Sinhagad Bliss, with the Sahyadri as the backdrop. Mehendi, haldi, receptions, corporate events and birthdays near Pune.",
  path: "/celebrations",
});

export default function CelebrationsPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Celebrations"
        lines={["Weddings", <>in the <em>foothills</em></>]}
        photo="weddingLawn2"
        alt="A flowered aisle on the lawn at dusk, between rows of dressed chairs, a stage and the hills beyond"
        caption="The lawn, set for a ceremony at dusk"
        position="object-[50%_62%]"
      >
        <p>
          A wedding on the lawn or in the banquet hall, with the Sahyadri behind you and rooms for both families. And a
          place for corporate events and birthdays.
        </p>
        <p className="mt-5 text-[0.95rem]">
          Wedding team, call or WhatsApp{" "}
          <a href={contact.weddingPhone.href} className="link-under tabular-nums text-ink">
            {contact.weddingPhone.display}
          </a>
        </p>
      </PageIntro>

      <section id="weddings" data-tone="dark" aria-labelledby="weddings-title" className="scroll-mt-16 bg-dusk text-mist">
        <div className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-36" style={{ "--veil": "var(--color-dusk)" } as React.CSSProperties}>
          <InView className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <h2 id="weddings-title" className="text-[clamp(2.8rem,6vw,6.2rem)] lg:col-span-7">
              <Lines lines={["Destination", <><em>weddings</em></>]} />
            </h2>
            <p className="clear max-w-md text-haze lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
              Our team works with you on the décor, the catering and the rooms, so the day goes the way you imagine it.
              Speak to the wedding team directly.
            </p>
          </InView>

          <ol className="mt-20 grid gap-20 md:mt-28 md:gap-28">
            {weddingMoments.map((moment, i) => (
              <li key={moment.title}>
                <InView amount={0.15} className="grid items-center gap-10 md:grid-cols-12">
                  <div className={`surface md:col-span-6 ${i % 2 === 1 ? "md:order-2 md:col-start-7" : ""}`}>
                    <ParallaxPhoto
                      name={moment.photo}
                      alt={moment.alt}
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="aspect-[4/5] bg-dusk-soft"
                      depth={5}
                    />
                  </div>
                  <div className={`md:col-span-4 ${i % 2 === 1 ? "md:order-1 md:col-start-2" : "md:col-start-8"}`}>
                    <p className="clear kicker tabular-nums text-apricot">
                      {String(i + 1).padStart(2, "0")} <span className="text-haze">of {String(weddingMoments.length).padStart(2, "0")}</span>
                    </p>
                    <h3 className="clear mt-5 text-[clamp(2.2rem,3.6vw,3.6rem)]" style={{ "--i": 1 } as React.CSSProperties}>
                      {moment.title}
                    </h3>
                    <p className="clear mt-5 text-haze" style={{ "--i": 2 } as React.CSSProperties}>
                      {moment.body}
                    </p>
                    <ul className="clear mt-7 grid gap-2 border-t border-mist/15 pt-6 text-[0.98rem]" style={{ "--i": 3 } as React.CSSProperties}>
                      {moment.points.map((point) => (
                        <li key={point} className="flex gap-3">
                          <span aria-hidden className="mt-[0.8em] h-px w-4 shrink-0 bg-apricot" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </InView>
              </li>
            ))}
          </ol>

          <InView as="figure" amount={0.15} className="mt-24 md:mt-32">
            <figcaption className="clear kicker mb-6 text-haze">Weddings at the resort</figcaption>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {moments.map((m, i) => (
                <div key={m.name} className="surface" style={{ "--i": i } as React.CSSProperties}>
                  <Photo name={m.name} alt={m.alt} sizes="(min-width: 768px) 24vw, 50vw" className="aspect-[3/4] bg-dusk-soft" imgClassName={m.position} />
                </div>
              ))}
            </div>
          </InView>

          <InView amount={0.3} className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-mist/15 pt-10 md:mt-20">
            <a href="#enquire" data-purpose="wedding" className="clear btn btn-apricot">
              Plan a wedding
            </a>
            <a href={`mailto:${contact.weddingEmail}`} className="clear link-under" style={{ "--i": 1 } as React.CSSProperties}>
              {contact.weddingEmail}
            </a>
          </InView>
        </div>
      </section>

      <section aria-labelledby="hall-title" className="bg-stone">
        <InView amount={0.1} className="mx-auto grid max-w-[1560px] gap-12 px-5 py-24 md:px-10 md:py-32 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 id="hall-title" className="text-[clamp(2.4rem,4.4vw,4.4rem)]">
              <Lines lines={["The banquet", <><em>hall</em></>]} />
            </h2>
            <p className="clear mt-6 max-w-sm text-slate" style={{ "--i": 2 } as React.CSSProperties}>
              An elegant, air-conditioned hall for weddings, corporate events and family gatherings, with the setup you
              need and skilled chefs and caterers.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:col-span-8">
            <div className="surface col-span-2">
              <Photo
                name="banquetHall"
                alt="The banquet hall set with dressed chairs either side of a patterned aisle, under chandeliers"
                sizes="(min-width: 1024px) 64vw, 100vw"
                className="aspect-[2/1]"
              />
            </div>
            <div className="surface" style={{ "--i": 1 } as React.CSSProperties}>
              <Photo name="stageHall" alt="A stage in the hall dressed with roses and greenery" sizes="(min-width: 1024px) 32vw, 50vw" className="aspect-[4/3]" />
            </div>
            <div className="surface" style={{ "--i": 2 } as React.CSSProperties}>
              <Photo name="sangeet" alt="Guests dancing on a stage in front of a wall of coloured lights" sizes="(min-width: 1024px) 32vw, 50vw" className="aspect-[4/3]" />
            </div>
          </div>
        </InView>
      </section>

      <section id="events" aria-labelledby="events-title" className="scroll-mt-16 bg-mist">
        <div className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-32">
          <InView className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <h2 id="events-title" className="text-[clamp(2.6rem,5.4vw,5.6rem)] lg:col-span-7">
              <Lines lines={["Offsites", <>and <em>birthdays</em></>]} />
            </h2>
            <div className="surface lg:col-span-4 lg:col-start-9" style={{ "--i": 1 } as React.CSSProperties}>
              <Photo name="games" alt="Table tennis and foosball in the games room" sizes="(min-width: 1024px) 30vw, 100vw" className="aspect-[3/2]" />
            </div>
          </InView>
          <div className="mt-16 grid gap-x-10 gap-y-14 md:mt-20 md:grid-cols-2">
            {eventTypes.map((event) => (
              <InView key={event.title} amount={0.3} className="border-t border-ink/15 pt-8">
                <h3 className="clear text-[clamp(1.9rem,2.8vw,2.8rem)]">{event.title}</h3>
                <p className="clear mt-3 max-w-md text-slate" style={{ "--i": 1 } as React.CSSProperties}>
                  {event.body}
                </p>
                <ul className="clear mt-6 grid gap-2 text-[0.98rem] sm:grid-cols-2" style={{ "--i": 2 } as React.CSSProperties}>
                  {event.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span aria-hidden className="mt-[0.8em] h-px w-4 shrink-0 bg-apricot-deep" />
                      {point}
                    </li>
                  ))}
                </ul>
              </InView>
            ))}
          </div>
          <a href="#enquire" data-purpose="event" className="btn btn-ink mt-14">
            Plan an event
          </a>
        </div>
      </section>

      <Enquiry defaultPurpose="wedding" />
    </PageTransition>
  );
}

import { contact, eventTypes, weddingMoments } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { Enquiry } from "@/components/enquiry";
import { InView, Words } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { ParallaxPhoto } from "@/components/parallax-photo";
import { Photo } from "@/components/photo";
import { PageTransition } from "@/components/page-transition";
import { SectionLabel } from "@/components/section-label";

export const metadata = pageMetadata({
  title: "Weddings and events",
  description:
    "Destination weddings at Bhilar, Mahabaleshwar: mehendi and haldi, the ceremony on the courtyard or lawn, and receptions in the Imperial Hall. Corporate events, birthdays and family occasions, with catering and rooms for guests.",
  path: "/celebrations",
});

export default function CelebrationsPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Celebrations"
        title="Weddings and *gatherings*"
        photo="weddingMandap"
        alt="A white floral mandap on the chequered courtyard, white chairs in rows and a tree behind"
      >
        <p>
          A wedding in the Western Ghats, a team offsite, a birthday or a family function. We make a package around
          your plans, with rooms for your guests and food from our kitchens.
        </p>
        <p className="mt-6 text-[0.95rem]">
          Weddings, call or WhatsApp{" "}
          <a href={contact.phone.href} className="arrow-link tabular-nums text-ink">
            {contact.phone.display}
          </a>
        </p>
      </PageIntro>

      <section id="weddings" data-tone="dark" aria-labelledby="weddings-title" className="scroll-mt-16 bg-ink text-mist [--lift:var(--color-ink)]">
        <div aria-hidden className="checker [--checker-a:var(--color-mist)] [--checker-b:var(--color-ink)] [--size:10px]" />
        <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-36">
          <InView className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <SectionLabel className="fade text-haze">Weddings</SectionLabel>
              <h2 id="weddings-title" className="mt-8 text-[clamp(2.8rem,6vw,6.4rem)] [--em-color:var(--color-clay)]">
                <Words text="Destination *weddings*" />
              </h2>
            </div>
            <div className="fade lg:col-span-4 lg:col-start-9 lg:self-end" style={{ "--i": 2 } as React.CSSProperties}>
              <p className="text-haze">
                Packages made to your plans, for the mehendi and haldi, the ceremony and the reception, with the hills
                behind every photograph.
              </p>
              <p className="mt-6">
                <a href={contact.phone.href} className="arrow-link tabular-nums">
                  {contact.phone.display}
                </a>
                <span className="text-haze">, call or WhatsApp</span>
              </p>
              <p className="mt-2">
                <a href={`mailto:${contact.weddingEmail}`} className="arrow-link break-all">
                  {contact.weddingEmail}
                </a>
              </p>
            </div>
          </InView>

          <ol className="mt-20 grid gap-20 md:mt-28 md:gap-28">
            {weddingMoments.map((moment, i) => (
              <li key={moment.title}>
                <InView amount={0.15} className="grid items-center gap-8 md:grid-cols-12 md:gap-10">
                  <div className={`lift md:col-span-7 ${i % 2 === 1 ? "md:order-2 md:col-start-6" : ""}`}>
                    <ParallaxPhoto name={moment.photo} alt={moment.alt} sizes="(min-width: 768px) 58vw, 100vw" className="aspect-[3/2]" depth={6} />
                  </div>
                  <div className={`md:col-span-4 ${i % 2 === 1 ? "md:order-1 md:col-start-1" : "md:col-start-9"}`}>
                    <p className="fade label tabular-nums text-clay">
                      {String(i + 1).padStart(2, "0")} <span className="text-haze">/ {String(weddingMoments.length).padStart(2, "0")}</span>
                    </p>
                    <h3 className="fade mt-5 text-[clamp(2rem,3.4vw,3.4rem)]">{moment.title}</h3>
                    <p className="fade mt-5 text-haze" style={{ "--i": 1 } as React.CSSProperties}>
                      {moment.body}
                    </p>
                    <ul className="fade mt-6 grid gap-2 text-[0.95rem]" style={{ "--i": 2 } as React.CSSProperties}>
                      {moment.points.map((point) => (
                        <li key={point} className="flex gap-3">
                          <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-clay" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </InView>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="venues-title" className="bg-cloud">
        <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-32">
          <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <SectionLabel className="fade text-moss">Venues</SectionLabel>
              <h2 id="venues-title" className="mt-8 text-[clamp(2.6rem,5.4vw,5.6rem)]">
                <Words text="A hall, a courtyard and a *lawn*" />
              </h2>
            </div>
            <p className="fade max-w-sm text-moss lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
              The Imperial Hall for receptions, meetings and functions, with the set-up you need. The chequered courtyard
              and the lawns for ceremonies in the open air.
            </p>
          </InView>

          <div className="mt-16 grid grid-cols-2 gap-3 md:mt-20 md:grid-cols-12 md:gap-4">
            <InView amount={0.1} className="col-span-2 md:col-span-7">
              <div className="lift h-full">
                <Photo name="imperialHall" alt="The Imperial Hall from outside: a dark facade with the name in gold letters, glass doors and a hedge" sizes="(min-width: 768px) 58vw, 100vw" className="aspect-[3/2]" />
              </div>
            </InView>
            <InView amount={0.1} className="col-span-2 md:col-span-5">
              <div className="lift h-full">
                <Photo name="hallStage" alt="Inside the Imperial Hall: rows of chairs facing a stage lit in blue and violet" sizes="(min-width: 768px) 42vw, 100vw" className="aspect-[3/2] md:aspect-auto md:h-full" />
              </div>
            </InView>
            <InView amount={0.1} className="md:col-span-4">
              <div className="lift h-full">
                <Photo name="hallConference" alt="The hall set for a meeting: one long table with dressed chairs and a screen" sizes="(min-width: 768px) 33vw, 50vw" className="aspect-[4/3]" />
              </div>
            </InView>
            <InView amount={0.1} className="md:col-span-4">
              <div className="lift h-full">
                <Photo name="hallChairs" alt="The hall with rows of dressed chairs on a marble floor" sizes="(min-width: 768px) 33vw, 50vw" className="aspect-[4/3]" />
              </div>
            </InView>
            <InView amount={0.1} className="col-span-2 md:col-span-4">
              <div className="lift h-full">
                <Photo name="weddingCourtyard" alt="A floral mandap and white chairs on the chequered courtyard between the cottages" sizes="(min-width: 768px) 33vw, 100vw" className="aspect-[4/3]" />
              </div>
            </InView>
          </div>

          <InView amount={0.2} className="mt-20 grid gap-6 md:mt-28 md:grid-cols-12 md:gap-8">
            <figure className="md:col-span-6">
              <div className="lift">
                <Photo name="weddingGuests" alt="Wedding guests in orange pheta turbans seated in the hall" sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[3/2]" />
              </div>
              <figcaption className="fade mt-4 text-[0.9rem] text-moss">Guests at a wedding in the hall.</figcaption>
            </figure>
            <figure className="md:col-span-6 md:mt-24">
              <div className="lift" style={{ "--i": 1 } as React.CSSProperties}>
                <Photo name="weddingBuffet" alt="Wedding guests in pheta turbans served at a long buffet in the dining hall" sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[3/2]" />
              </div>
              <figcaption className="fade mt-4 text-[0.9rem] text-moss">The wedding lunch, from our kitchens.</figcaption>
            </figure>
          </InView>
        </div>
      </section>

      <section id="events" aria-labelledby="events-title" className="scroll-mt-16 bg-mist">
        <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-36">
          <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <SectionLabel className="fade text-moss">Events</SectionLabel>
              <h2 id="events-title" className="mt-8 max-w-4xl text-[clamp(2.8rem,6vw,6.4rem)]">
                <Words text="Offsites and *occasions*" />
              </h2>
            </div>
            <p className="fade max-w-sm text-moss lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
              Corporate events, exhibitions, trainings, cultural and educational events, and every kind of family
              function, formal or informal.
            </p>
          </InView>
          <div className="mt-16 grid gap-x-10 gap-y-16 md:mt-20 md:grid-cols-3">
            {eventTypes.map((event, i) => (
              <InView key={event.title} amount={0.3} className="border-t border-ink/15 pt-8">
                <p className="fade label tabular-nums text-laterite">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="fade mt-4 text-[clamp(1.9rem,2.6vw,2.6rem)]">{event.title}</h3>
                <p className="fade mt-3 max-w-md text-moss">{event.body}</p>
                <ul className="fade mt-6 grid gap-2 text-[0.95rem]" style={{ "--i": 1 } as React.CSSProperties}>
                  {event.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-laterite" />
                      {point}
                    </li>
                  ))}
                </ul>
              </InView>
            ))}
          </div>
        </div>
      </section>

      <Enquiry defaultPurpose="wedding" />
    </PageTransition>
  );
}

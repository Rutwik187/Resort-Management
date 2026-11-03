import { contact, eventTypes, weddingMoments } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { Enquiry } from "@/components/enquiry";
import { InView, RiseLines } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { Photo } from "@/components/photo";
import { ParallaxPhoto } from "@/components/parallax-photo";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Weddings and events",
  description:
    "Destination weddings, haldi, receptions and pre-wedding shoots in the Sahyadri near Pune, plus corporate offsites, birthdays and reunions with an AC banquet hall and in-house catering.",
  path: "/celebrations",
});

export default function CelebrationsPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Celebrations"
        lines={["Weddings", "and gatherings"]}
        photo="weddingMandapWhite"
        alt="A bride and groom at a white floral mandap, smoke rising from the sacred fire"
      >
        <p>
          A wedding weekend in the Sahyadri, a team offsite, a birthday or a family reunion. One valley, rooms for
          everyone, and a team to plan it with you.
        </p>
      </PageIntro>

      <section id="weddings" aria-labelledby="weddings-title" className="scroll-mt-16 bg-forest text-paper">
        <div className="mx-auto max-w-[1680px] px-5 py-24 md:px-10 md:py-36">
          <InView className="grid gap-10 lg:grid-cols-12">
            <h2 id="weddings-title" className="text-[clamp(2.8rem,6vw,6.4rem)] lg:col-span-7">
              <RiseLines lines={["Destination", "weddings"]} />
            </h2>
            <div className="fade lg:col-span-4 lg:col-start-9 lg:self-end">
              <p className="text-sage">
                Customised packages for the ceremony, the haldi and mehendi, the reception and the pre-wedding shoot.
                Speak to our wedding team directly.
              </p>
              <p className="mt-6">
                <a href={contact.weddingPhone.href} className="link-line">
                  {contact.weddingPhone.display}
                </a>
                <span className="text-sage">, call or WhatsApp</span>
              </p>
              <p className="mt-2">
                <a href={`mailto:${contact.weddingEmail}`} className="link-line">
                  {contact.weddingEmail}
                </a>
              </p>
            </div>
          </InView>

          <ol className="mt-20 grid gap-20 md:mt-28 md:gap-28">
            {weddingMoments.map((moment, i) => (
              <li key={moment.title}>
                <InView amount={0.15} className="grid items-center gap-8 md:grid-cols-12 md:gap-10">
                  <div className={`unveil md:col-span-7 ${i % 2 === 1 ? "md:order-2 md:col-start-6" : ""}`}>
                    <ParallaxPhoto name={moment.photo} alt="" sizes="(min-width: 768px) 58vw, 100vw" className="aspect-[3/2]" depth={6} />
                  </div>
                  <div className={`md:col-span-4 ${i % 2 === 1 ? "md:order-1 md:col-start-1" : "md:col-start-9"}`}>
                    <p className="fade label tabular-nums text-sun">
                      {String(i + 1).padStart(2, "0")} <span className="text-sage">/ {String(weddingMoments.length).padStart(2, "0")}</span>
                    </p>
                    <h3 className="fade mt-5 text-[clamp(2rem,3.4vw,3.4rem)]">{moment.title}</h3>
                    <p className="fade mt-5 text-sage" style={{ "--i": 1 } as React.CSSProperties}>
                      {moment.body}
                    </p>
                  </div>
                </InView>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="hall-title" className="bg-linen">
        <InView amount={0.15} className="mx-auto grid max-w-[1680px] gap-10 px-5 py-24 md:px-10 md:py-32 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="hall-title" className="text-[clamp(2.4rem,4.4vw,4.4rem)]">
              <RiseLines lines={["The banquet", "hall"]} />
            </h2>
            <p className="fade mt-6 max-w-sm text-fern">
              Air-conditioned, with a technical setup for talks and music, ample parking outside, and catering from
              our own kitchens. Ideal for every function.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:col-span-8">
            <div className="unveil col-span-2">
              <Photo name="banquetHall" alt="The banquet hall laid out with rows of dressed chairs" sizes="(min-width: 1024px) 64vw, 100vw" className="aspect-[2/1]" />
            </div>
            <div className="unveil" style={{ "--i": 1 } as React.CSSProperties}>
              <Photo name="banquetExterior" alt="The entrance to the banquet hall" sizes="(min-width: 1024px) 32vw, 50vw" className="aspect-[4/3]" />
            </div>
            <div className="unveil" style={{ "--i": 2 } as React.CSSProperties}>
              <Photo name="banquetStage" alt="A stage dressed with flowers and greenery" sizes="(min-width: 1024px) 32vw, 50vw" className="aspect-[4/3]" />
            </div>
          </div>
        </InView>
      </section>

      <section id="events" aria-labelledby="events-title" className="scroll-mt-16 bg-paper">
        <div className="mx-auto max-w-[1680px] px-5 py-24 md:px-10 md:py-36">
          <InView>
            <h2 id="events-title" className="max-w-4xl text-[clamp(2.8rem,6vw,6.4rem)]">
              <RiseLines lines={["Offsites and", "celebrations"]} />
            </h2>
          </InView>
          <div className="mt-16 grid gap-x-10 gap-y-16 md:mt-20 md:grid-cols-2">
            {eventTypes.map((event) => (
              <InView key={event.title} amount={0.3} className="border-t border-forest/15 pt-8">
                <h3 className="fade text-[clamp(1.9rem,2.8vw,2.8rem)]">{event.title}</h3>
                <p className="fade mt-3 max-w-md text-fern">{event.body}</p>
                <ul className="fade mt-6 grid gap-2 text-[0.95rem] sm:grid-cols-2" style={{ "--i": 1 } as React.CSSProperties}>
                  {event.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-sun-deep" />
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

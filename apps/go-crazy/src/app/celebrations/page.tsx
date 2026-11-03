import { Enquiry } from "@/components/enquiry";
import { InView, SnapLines } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { PageTransition } from "@/components/page-transition";
import { Photo } from "@/components/photo";
import { contact, weddingMoments } from "@/content/resort";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({
  title: "Weddings and events",
  description:
    "Destination weddings, haldi and mehendi, receptions, company days out and birthdays at Prathamesh Go Crazy, Sinhagad, Pune, with the Sapphire Banquet hall, lawns, catering and rooms for guests.",
  path: "/celebrations",
});

const alts = {
  lawn: "A wide green lawn between palms and cottages, ready for a ceremony",
  banquetHall: "The Sapphire Banquet hall with a decorated stage, chandeliers and rows of dressed chairs",
  treeWalk: "A path under old trees beside a wall painted with village scenes",
} as const;

export default function CelebrationsPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Celebrations"
        lines={["Weddings", "and events"]}
        photo={{ name: "banquetRows", alt: "Rows of chairs dressed in white and purple in the Sapphire Banquet hall, under chandeliers" }}
      >
        <p>
          A wedding against the Sahyadri, a company day out or a birthday with the whole park as the playground. The
          lawns and the Sapphire Banquet hall, professional catering and rooms for guests.
        </p>
        <p className="mt-5 text-[0.98rem] text-ink">
          Weddings, call or WhatsApp{" "}
          <a href={contact.weddingPhone.href} className="link-line tabular-nums">
            {contact.weddingPhone.display}
          </a>
          <br />
          <a href={`mailto:${contact.weddingEmail}`} className="link-line">
            {contact.weddingEmail}
          </a>
        </p>
      </PageIntro>

      <section id="weddings" aria-labelledby="weddings-title" data-tone="dark" className="scroll-mt-16 bg-pine text-chalk">
        <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
          <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="up label marker marker-lime">Destination weddings</p>
              <h2 id="weddings-title" className="mt-6 text-[clamp(3.4rem,8vw,7.4rem)]">
                <SnapLines lines={["Indoors or", "out on the lawn"]} />
              </h2>
            </div>
            <p className="up text-mist lg:col-span-5" style={{ "--i": 2 } as React.CSSProperties}>
              A package made around you, for the ceremony, the haldi and mehendi, the reception and the pre-wedding
              shoot. Speak to the wedding team directly.
            </p>
          </InView>

          <ol className="mt-16 grid gap-16 md:mt-20 md:gap-24">
            {weddingMoments.map((moment, i) => (
              <li key={moment.title}>
                <InView amount={0.15} className="grid items-center gap-8 md:grid-cols-12 md:gap-10">
                  <div className={`wipe md:col-span-7 ${i % 2 === 1 ? "md:order-2 md:col-start-6" : ""}`}>
                    <Photo name={moment.photo} alt={alts[moment.photo as keyof typeof alts] ?? ""} sizes="(min-width: 768px) 58vw, 100vw" className="aspect-[3/2] rounded-[6px]" />
                  </div>
                  <div className={`md:col-span-5 ${i % 2 === 1 ? "md:order-1 md:col-start-1" : "md:col-start-8"}`}>
                    <p className="up label tabular-nums text-lime">
                      {String(i + 1).padStart(2, "0")} <span className="text-mist">/ {String(weddingMoments.length).padStart(2, "0")}</span>
                    </p>
                    <h3 className="up mt-4 text-[clamp(2.6rem,4.6vw,4.2rem)]">{moment.title}</h3>
                    <p className="up mt-4 text-mist" style={{ "--i": 1 } as React.CSSProperties}>
                      {moment.body}
                    </p>
                    <ul className="up mt-6 grid gap-2 text-[0.98rem]" style={{ "--i": 2 } as React.CSSProperties}>
                      {moment.points.map((point) => (
                        <li key={point} className="flex gap-3">
                          <span aria-hidden className="mt-[0.55em] size-2 shrink-0 bg-lime" />
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

      <section aria-labelledby="hall-title" className="bg-chalk">
        <InView amount={0.15} className="mx-auto grid max-w-[1600px] gap-10 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="up label marker marker-brick">The hall</p>
            <h2 id="hall-title" className="mt-6 text-[clamp(3rem,6vw,5.6rem)]">
              <SnapLines lines={["Sapphire", "Banquet"]} />
            </h2>
            <p className="up mt-6 max-w-sm text-stone" style={{ "--i": 2 } as React.CSSProperties}>
              The park&apos;s banquet hall, for the ceremony, the reception or a company day, with the lawns outside
              for everything else.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:col-span-8">
            <div className="wipe col-span-2">
              <Photo name="banquetHall" alt={alts.banquetHall} sizes="(min-width: 1024px) 64vw, 100vw" className="aspect-[2/1] rounded-[6px]" />
            </div>
            <div className="wipe" style={{ "--i": 1 } as React.CSSProperties}>
              <Photo name="banquet" alt="The front of the Sapphire Banquet hall, with flower beds along its glass wall" sizes="(min-width: 1024px) 32vw, 50vw" className="aspect-[4/3] rounded-[6px]" />
            </div>
            <div className="wipe" style={{ "--i": 2 } as React.CSSProperties}>
              <Photo name="lawnStage" alt="The open lawn in front of a stage, with the hills beyond" sizes="(min-width: 1024px) 32vw, 50vw" className="aspect-[4/3] rounded-[6px]" />
            </div>
          </div>
        </InView>
      </section>

      <section id="events" aria-labelledby="events-title" className="scroll-mt-16 border-t-2 border-ink bg-bone">
        <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
          <InView>
            <p className="up label marker marker-brick">Events</p>
            <h2 id="events-title" className="mt-6 text-[clamp(3.4rem,8vw,7.4rem)]">
              <SnapLines lines={["Company days", "and birthdays"]} />
            </h2>
          </InView>
          <div className="mt-14 grid gap-x-10 gap-y-14 md:grid-cols-2">
            <InView amount={0.3} className="border-t-2 border-ink pt-7">
              <h3 className="up text-[clamp(2.2rem,3.4vw,3rem)]">Company days out</h3>
              <p className="up mt-4 max-w-md text-stone" style={{ "--i": 1 } as React.CSSProperties}>
                Outbound office outings, team days and club trips, with the adventure course, the pool, meals for
                everyone and the banquet hall when you need a room.
              </p>
              <a href="#enquire" data-purpose="event" className="up btn btn-ink mt-7" style={{ "--i": 2 } as React.CSSProperties}>
                Plan a company day <span aria-hidden className="arrow">→</span>
              </a>
            </InView>
            <InView amount={0.3} className="border-t-2 border-ink pt-7">
              <h3 className="up text-[clamp(2.2rem,3.4vw,3rem)]">Birthdays and family days</h3>
              <p className="up mt-4 max-w-md text-stone" style={{ "--i": 1 } as React.CSSProperties}>
                Birthdays and family occasions, on the lawn or in the banquet hall, with professional catering and
                menu options.
              </p>
              <a href="#enquire" data-purpose="event" className="up btn btn-ghost mt-7" style={{ "--i": 2 } as React.CSSProperties}>
                Plan a celebration
              </a>
            </InView>
          </div>
        </div>
      </section>

      <Enquiry defaultPurpose="wedding" />
    </PageTransition>
  );
}

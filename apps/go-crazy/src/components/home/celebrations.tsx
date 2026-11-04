import Link from "next/link";
import { contact } from "@/content/resort";
import { InView, SnapLines } from "../in-view";
import { Photo } from "../photo";

export function CelebrationsTeaser() {
  return (
    <section aria-labelledby="celebrations-title" className="bg-chalk">
      <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <InView className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="up label marker marker-brick">Celebrations</p>
            <h2 id="celebrations-title" className="mt-6 text-[clamp(3.8rem,10vw,9.5rem)]">
              <SnapLines lines={["Weddings,", "offsites and", "birthdays"]} />
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="up text-stone" style={{ "--i": 2 } as React.CSSProperties}>
              The lawns and the Sapphire Banquet hall host the ceremony, the haldi and mehendi, the reception, company
              days out and birthdays. An on-site manager runs the day, and there are rooms for the family.
            </p>
            <p className="up mt-5 text-[0.98rem]" style={{ "--i": 3 } as React.CSSProperties}>
              Weddings, call or WhatsApp{" "}
              <a href={contact.weddingPhone.href} className="link-line tabular-nums">
                {contact.weddingPhone.display}
              </a>
            </p>
          </div>
        </InView>

        <InView amount={0.1} className="mt-12 grid gap-3 md:mt-16 md:grid-cols-12">
          <figure className="md:col-span-8">
            <div className="wipe">
              <Photo
                name="banquetHall"
                alt="The Sapphire Banquet hall set for a function: rows of dressed chairs, chandeliers and a decorated stage"
                sizes="(min-width: 768px) 64vw, 100vw"
                className="aspect-[3/2] rounded-[6px]"
              />
            </div>
            <figcaption className="up mt-3 text-[0.9rem] text-stone">The Sapphire Banquet hall</figcaption>
          </figure>
          <div className="grid gap-3 md:col-span-4">
            <figure>
              <div className="wipe" style={{ "--i": 1 } as React.CSSProperties}>
                <Photo name="lawn" alt="A wide green lawn between palms and cottages" sizes="(min-width: 768px) 32vw, 100vw" className="aspect-[4/3] rounded-[6px]" />
              </div>
              <figcaption className="up mt-3 text-[0.9rem] text-stone">The main lawn</figcaption>
            </figure>
            <figure>
              <div className="wipe" style={{ "--i": 2 } as React.CSSProperties}>
                <Photo name="banquet" alt="The front of the Sapphire Banquet hall, with flower beds along its glass wall" sizes="(min-width: 768px) 32vw, 100vw" className="aspect-[4/3] rounded-[6px]" />
              </div>
            </figure>
          </div>
        </InView>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a href="#enquire" data-purpose="wedding" className="btn btn-ink">
            Plan a wedding <span aria-hidden className="arrow">→</span>
          </a>
          <a href="#enquire" data-purpose="event" className="btn btn-ghost">
            Plan a company day
          </a>
          <Link href="/celebrations" className="link-line">
            Weddings and events
          </Link>
        </div>
      </div>
    </section>
  );
}

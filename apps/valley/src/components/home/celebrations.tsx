import Link from "next/link";
import { contact, eventTypes, listLine } from "@/content/resort";
import { InView, Words } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";
import { Photo } from "../photo";
import { SectionLabel } from "../section-label";

/** Weddings and events: the courtyard, the lawn and the Imperial Hall. */
export function Celebrations() {
  return (
    <section data-tone="dark" aria-labelledby="celebrations-title" className="overflow-hidden bg-night text-mist [--lift:var(--color-night)]">
      <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-36">
        <InView className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <SectionLabel className="fade text-haze">Celebrations</SectionLabel>
            <h2 id="celebrations-title" className="mt-8 text-[clamp(3rem,7vw,7.6rem)] [--em-color:var(--color-clay)]">
              <Words text="Weddings in the *Ghats*" />
            </h2>
          </div>
          <div className="fade lg:col-span-4" style={{ "--i": 2 } as React.CSSProperties}>
            <p className="text-haze">
              A mandap on the chequered courtyard, a red carpet across the lawn, a reception in the Imperial Hall, and rooms
              for both families.
            </p>
            <p className="mt-5 text-[0.95rem]">
              Weddings, call or WhatsApp{" "}
              <a href={contact.phone.href} className="arrow-link tabular-nums">
                {contact.phone.display}
              </a>
            </p>
          </div>
        </InView>

        <div className="mt-16 grid gap-6 md:mt-24 md:grid-cols-12 md:gap-8">
          <InView as="figure" amount={0.1} className="md:col-span-8">
            <div className="lift">
              <ParallaxPhoto
                name="weddingCourtyardAerial"
                alt="From above: a white floral mandap and rows of white chairs on the chequered courtyard, with cottages around"
                sizes="(min-width: 768px) 66vw, 100vw"
                className="aspect-[4/3]"
                depth={7}
              />
            </div>
            <figcaption className="fade mt-4 text-[0.9rem] text-haze">A ceremony on the chequered courtyard.</figcaption>
          </InView>
          <InView as="figure" amount={0.1} className="md:col-span-4 md:mt-40">
            <div className="lift">
              <Photo
                name="weddingAisleTall"
                alt="A red carpet between white chairs on the lawn, leading to a stage of white flowers"
                sizes="(min-width: 768px) 32vw, 100vw"
                className="aspect-[3/4]"
              />
            </div>
            <figcaption className="fade mt-4 text-[0.9rem] text-haze">An aisle across the lawn.</figcaption>
          </InView>
        </div>

        <InView amount={0.3} className="mt-20 grid gap-10 border-t border-mist/15 pt-10 md:mt-28 lg:grid-cols-12">
          <div className="fade lg:col-span-6">
            <h3 className="text-[clamp(2rem,3.2vw,3.2rem)]">Events of every size</h3>
            <p className="mt-4 max-w-md text-haze">
              {listLine(eventTypes.map((e) => e.title.toLowerCase()))}, in the Imperial Hall, with catering
              from our own kitchens.
            </p>
          </div>
          <div className="fade flex flex-wrap items-center gap-x-8 gap-y-4 lg:col-span-5 lg:col-start-8 lg:justify-end" style={{ "--i": 1 } as React.CSSProperties}>
            <Link href="/celebrations" className="btn btn-mist">
              Plan a wedding <span aria-hidden className="btn-arrow">→</span>
            </Link>
            <Link href="/celebrations#events" className="arrow-link">
              Plan an event
            </Link>
          </div>
        </InView>
      </div>
    </section>
  );
}

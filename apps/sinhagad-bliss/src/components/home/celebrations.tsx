import Link from "next/link";
import { contact } from "@/content/resort";
import { InView, Lines } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";
import { Photo } from "../photo";

export function Celebrations() {
  return (
    <section data-tone="dark" aria-labelledby="celebrations-title" className="overflow-hidden bg-night text-mist">
      <div className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-36" style={{ "--veil": "var(--color-night)" } as React.CSSProperties}>
        <InView className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="clear kicker text-haze">Celebrations</p>
            <h2 id="celebrations-title" className="mt-7 text-[clamp(3rem,6.6vw,7rem)]">
              <Lines lines={["Weddings", <>under the <em>hills</em></>]} start={1} />
            </h2>
          </div>
          <div className="clear lg:col-span-4 lg:col-start-9" style={{ "--i": 3 } as React.CSSProperties}>
            <p className="text-haze">
              Say “I do” on the lawn with the Sahyadri behind you, or in the banquet hall. Mehendi and haldi by the
              pool, and a reception indoors or out.
            </p>
            <p className="mt-5 text-[0.95rem]">
              Wedding team, call or WhatsApp{" "}
              <a href={contact.weddingPhone.href} className="link-under tabular-nums">
                {contact.weddingPhone.display}
              </a>
            </p>
          </div>
        </InView>

        <InView amount={0.1} className="mt-16 grid gap-3 sm:gap-5 md:mt-24 md:grid-cols-12">
          <figure className="md:col-span-8">
            <div className="surface">
              <ParallaxPhoto
                name="weddingLawn"
                alt="A flowered aisle across the lawn at dusk, rows of dressed chairs on both sides and a stage at the end"
                sizes="(min-width: 768px) 64vw, 100vw"
                className="aspect-[4/3] bg-dusk-soft"
                depth={6}
              />
            </div>
            <figcaption className="clear mt-4 text-[0.92rem] text-haze">A ceremony set on the lawn at dusk</figcaption>
          </figure>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:col-span-4 md:grid-cols-1">
            <div className="surface" style={{ "--i": 1 } as React.CSSProperties}>
              <Photo
                name="haldiCouple"
                alt="A bride and groom at their haldi, on a stage of marigolds set over the pool"
                sizes="(min-width: 768px) 30vw, 50vw"
                className="aspect-[3/4] bg-dusk-soft md:aspect-[4/3]"
                imgClassName="object-[50%_62%]"
              />
            </div>
            <div className="surface" style={{ "--i": 2 } as React.CSSProperties}>
              <Photo
                name="banquetHall"
                alt="The banquet hall set with dressed chairs on both sides of a patterned aisle, under chandeliers"
                sizes="(min-width: 768px) 30vw, 50vw"
                className="aspect-[3/4] bg-dusk-soft md:aspect-[4/3]"
              />
            </div>
          </div>
        </InView>

        <InView amount={0.3} className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link href="/celebrations" className="clear btn btn-apricot">
            Weddings and events
          </Link>
          <a href="#enquire" data-purpose="wedding" className="clear link-rule text-mist" style={{ "--i": 1 } as React.CSSProperties}>
            Plan a wedding
          </a>
        </InView>
      </div>
    </section>
  );
}

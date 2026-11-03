import Link from "next/link";
import { contact, formatRupees, stays, type Stay } from "@/content/resort";
import { InView, SnapLines } from "../in-view";
import { Photo } from "../photo";

/** The lowest published rate for a stay, with what it covers. */
export function fromRate(stay: Stay) {
  if (stay.perPerson) return { amount: formatRupees(stay.perPerson), basis: "a person" };
  return { amount: formatRupees(stay.weekday!.base), basis: "a couple" };
}

export function StaysTeaser() {
  return (
    <section aria-labelledby="stays-title" className="bg-bone">
      <div className="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <InView className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="up label marker marker-brick">Stays</p>
            <h2 id="stays-title" className="mt-6 text-[clamp(3.8rem,10vw,9rem)]">
              <SnapLines lines={["Stay the", "night"]} />
            </h2>
            <p className="up mt-7 max-w-md text-stone" style={{ "--i": 2 } as React.CSSProperties}>
              Laterite stone cottages, painted cottages and villas for groups, all air-conditioned, with meals from
              separate veg and non-veg kitchens. Every stay includes the activities and games.
            </p>
            <p className="up mt-5 text-[0.95rem] font-semibold" style={{ "--i": 3 } as React.CSSProperties}>
              Check-in {contact.checkIn} · Check-out {contact.checkOut}
            </p>
          </div>
          <div className="wipe lg:col-span-7" style={{ "--i": 1 } as React.CSSProperties}>
            <Photo
              name="chiraPalms"
              alt="Two red laterite stone cottages with carved white eaves, a palm between them, on a green lawn"
              sizes="(min-width: 1024px) 56vw, 100vw"
              className="aspect-[3/2] rounded-[6px]"
            />
          </div>
        </InView>

        <InView as="ul" amount={0.1} className="mt-12 border-t-2 border-ink md:mt-16">
          {stays.map((stay, i) => {
            const rate = fromRate(stay);
            return (
              <li key={stay.slug} className="up border-b-2 border-ink" style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={`/stays#${stay.slug}`}
                  className="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 gap-y-1 py-4 md:grid-cols-[7rem_1.2fr_1fr_auto] md:gap-x-8"
                >
                  <Photo name={stay.photos[0]} alt="" sizes="112px" className="row-span-2 aspect-square rounded-[4px] md:row-span-1" />
                  <h3 className="text-[clamp(1.9rem,3.4vw,3.2rem)] transition-transform duration-300 ease-out group-hover:translate-x-2">{stay.name}</h3>
                  <p className="col-start-2 row-start-2 text-[0.92rem] leading-snug text-stone md:col-start-3 md:row-start-1">
                    {stay.line} {stay.units}, {stay.guests}.
                  </p>
                  <p className="col-start-3 row-span-2 row-start-1 text-right md:col-start-4 md:row-span-1">
                    <span className="block text-[0.8rem] text-stone">from</span>
                    <span className="figure text-[clamp(1.8rem,2.8vw,2.6rem)]">{rate.amount}</span>
                    <span className="block text-[0.8rem] text-stone">{rate.basis}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </InView>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
          <p className="text-[0.92rem] text-stone">Cottage prices are Monday to Thursday rates, per night, plus GST. Villas have one rate every day.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="#enquire" data-purpose="stay" className="btn btn-ink">
              Ask about a stay <span aria-hidden className="arrow">→</span>
            </a>
            <Link href="/stays" className="link-line">
              Rooms and rates
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

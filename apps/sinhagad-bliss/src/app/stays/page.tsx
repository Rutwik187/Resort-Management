import { amenities, contact, couplePackages, coupleGuests, formatRupees, groupPackage, packageIncludes, rateOrFree, villas } from "@/content/resort";
import type { PhotoKey } from "@/content/photos";
import { pageMetadata } from "@/content/site";
import { Enquiry } from "@/components/enquiry";
import { InView, Lines } from "@/components/in-view";
import { Offers } from "@/components/offers";
import { PageIntro } from "@/components/page-intro";
import { Photo } from "@/components/photo";
import { PageTransition } from "@/components/page-transition";
import { ViewMatrix } from "@/components/view-matrix";

export const metadata = pageMetadata({
  title: "Stays",
  description:
    "Rooms with a mountain view or a pool, villas with private pools, and a group package near Sinhagad, Pune. Room counts, couple and group rates, and what every package includes.",
  path: "/stays",
});

// Extra guests and children cost the same in every couple package.
const shared = couplePackages[0];

const inside: { name: PhotoKey; alt: string; frame: string }[] = [
  { name: "roomBed", alt: "A double bed with towels folded into swans, under a warm cove light", frame: "aspect-[3/2] sm:col-span-2" },
  { name: "roomMarble", alt: "A bright room with a marble floor, a double bed and a window onto the trees", frame: "aspect-[3/4]" },
  { name: "veranda", alt: "Two chairs on a cottage veranda beside a panelled wall, the garden beyond", frame: "aspect-[3/4]" },
  { name: "roomGarden", alt: "A room whose glass doors open onto a garden", frame: "aspect-[3/2] sm:col-span-2" },
  { name: "balconyHills", alt: "A balcony table set with a snack tray, green hills beyond the railing", frame: "aspect-[3/4]" },
  { name: "bathPetals", alt: "A jacuzzi bath scattered with rose petals, under a window onto the trees", frame: "aspect-[3/4]" },
];

export default function StaysPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Stays"
        lines={["Rooms with", <>a <em>view</em></>]}
        photo="lawnPath"
        alt="A lawn running between two rows of cottages, under tall trees"
        caption="The lawn between the cottages"
      >
        <p>
          Rooms that face the hills or open onto a pool, villas for more space, and a group package for four or more.
          Every package includes the activities, the amenities and more than fifteen indoor games.
        </p>
        <p className="mt-5 text-[0.95rem]">
          Check-in {contact.checkIn}. Check-out {contact.checkOut}.
        </p>
      </PageIntro>

      <nav aria-label="On this page" className="border-y border-ink/10 bg-stone">
        <ul className="no-scrollbar mx-auto flex max-w-[1560px] gap-x-10 overflow-x-auto px-5 py-4 md:justify-center md:px-10">
          {[
            ["#rooms", "The rooms"],
            ["#rates", "Rates"],
            ["#villas", "Villas"],
            ["#inside", "Inside"],
            ["#amenities", "Amenities"],
          ].map(([href, label]) => (
            <li key={href} className="shrink-0">
              <a href={href} className="kicker flex min-h-11 items-center text-slate transition-colors hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="rooms" aria-labelledby="rooms-title" className="scroll-mt-16 bg-stone">
        <InView amount={0.1} className="mx-auto grid max-w-[1560px] gap-14 px-5 pb-24 pt-20 md:px-10 md:pb-32 md:pt-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 id="rooms-title" className="text-[clamp(2.6rem,4.8vw,4.8rem)]">
              <Lines lines={["Four kinds", <>of <em>room</em></>]} />
            </h2>
            <p className="clear mt-8 max-w-sm text-slate" style={{ "--i": 2 } as React.CSSProperties}>
              Choose by two things: the mountain in view or not, a pool or not. Rooms have a private balcony, a television
              and hot water, and sleep {coupleGuests}.
            </p>
          </div>
          <ViewMatrix className="clear lg:col-span-8" />
        </InView>
      </section>

      <section id="rates" aria-labelledby="rates-title" className="scroll-mt-16 bg-mist">
        <InView amount={0.1} className="mx-auto grid max-w-[1560px] gap-14 px-5 py-24 md:px-10 md:py-32 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 id="rates-title" className="text-[clamp(2.6rem,4.8vw,4.8rem)]">
              <Lines lines={["Packages", <>and <em>rates</em></>]} />
            </h2>
            <p className="clear mt-8 max-w-sm text-slate" style={{ "--i": 2 } as React.CSSProperties}>
              The couple packages as published, per couple. Monday to Thursday is the CP plan, the room with breakfast.
              Friday and Saturday is the MAP plan, breakfast and one main meal.
            </p>
            <ul className="clear mt-8 grid gap-2 text-[0.98rem]" style={{ "--i": 3 } as React.CSSProperties}>
              {packageIncludes.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-[0.8em] h-px w-4 shrink-0 bg-apricot-deep" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="clear lg:col-span-8" style={{ "--i": 1 } as React.CSSProperties}>
            <table className="w-full text-left text-[0.98rem]">
              <caption className="sr-only">Couple package rates per night, plus GST</caption>
              <thead>
                <tr className="border-b border-ink/20">
                  <th scope="col" className="kicker py-4 pr-4 font-medium text-slate">
                    Couple package
                  </th>
                  <th scope="col" className="kicker py-4 text-right font-medium text-slate">
                    Mon to Thu
                  </th>
                  <th scope="col" className="kicker py-4 pl-4 text-right font-medium text-slate">
                    Fri and Sat
                  </th>
                </tr>
              </thead>
              <tbody>
                {couplePackages.map((p) => (
                  <tr key={p.id} className="border-b border-ink/10">
                    <th scope="row" className="py-4 pr-4 font-normal">
                      {p.name}
                    </th>
                    <td className="display py-4 text-right text-[1.7rem] tabular-nums">{formatRupees(p.weekday.couple)}</td>
                    <td className="display py-4 pl-4 text-right text-[1.7rem] tabular-nums">{formatRupees(p.weekend.couple)}</td>
                  </tr>
                ))}
              </tbody>
              <tbody>
                <tr>
                  <th scope="rowgroup" colSpan={3} className="kicker pb-2 pt-8 font-medium text-slate">
                    The same in every couple package
                  </th>
                </tr>
                {[
                  { label: "Extra guest, over 11", get: (p: typeof shared.weekday) => p.extraGuest },
                  { label: "Child, 5 to 11", get: (p: typeof shared.weekday) => p.child5to11 },
                  { label: "Child, 3 to 5", get: (p: typeof shared.weekday) => p.child3to5 },
                ].map((row) => (
                  <tr key={row.label} className="border-t border-ink/10">
                    <th scope="row" className="py-3 pr-4 font-normal text-slate">
                      {row.label}
                    </th>
                    <td className="py-3 text-right tabular-nums">{rateOrFree(row.get(shared.weekday))}</td>
                    <td className="py-3 pl-4 text-right tabular-nums">{rateOrFree(row.get(shared.weekend))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-14 grid gap-8 border-t border-ink/20 pt-8 sm:grid-cols-2">
              <div>
                <h3 className="text-[clamp(1.8rem,2.6vw,2.4rem)]">{groupPackage.name}</h3>
                <p className="mt-3 text-slate">
                  For {groupPackage.minimum} people or more, with meals, every activity and amenity, and the indoor
                  games.
                </p>
              </div>
              <dl className="grid content-start gap-3 text-[0.98rem]">
                <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 pb-3">
                  <dt className="text-slate">Per person</dt>
                  <dd className="display text-[1.9rem] tabular-nums">{formatRupees(groupPackage.perPerson)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 pb-3">
                  <dt className="text-slate">Child, 5 to 11</dt>
                  <dd className="tabular-nums">{formatRupees(groupPackage.child5to11)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 pb-3">
                  <dt className="text-slate">Child, 3 to 5</dt>
                  <dd className="tabular-nums">{formatRupees(groupPackage.child3to5)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-slate">Under 3</dt>
                  <dd>Free</dd>
                </div>
              </dl>
            </div>

            <p className="mt-10 text-[0.92rem] text-slate">
              Couple and extra-guest rates are plus GST. The mountain view with jacuzzi package is published without a
              room count; ask the team which rooms it covers.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <a href="#enquire" className="btn btn-ink">
                Ask for these dates
              </a>
              <a href={contact.phone.href} className="link-under tabular-nums">
                Call {contact.phone.display}
              </a>
            </div>
          </div>
        </InView>
      </section>

      <section id="villas" aria-labelledby="villas-title" className="scroll-mt-16 bg-mist">
        <InView amount={0.1} className="mx-auto grid max-w-[1560px] gap-14 border-t border-ink/10 px-5 py-24 md:px-10 md:py-32 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 id="villas-title" className="text-[clamp(2.6rem,4.8vw,4.8rem)]">
              <Lines lines={["Villas,", <>some with a <em>pool</em></>]} />
            </h2>
            <ul className="mt-10 border-t border-ink/15">
              {villas.map((v, i) => (
                <li key={v.name} className="clear border-b border-ink/15 py-4" style={{ "--i": i + 2 } as React.CSSProperties}>
                  <span className="block text-[1.15rem]">{v.name}</span>
                  <span className="block text-[0.95rem] text-slate">{v.detail}</span>
                </li>
              ))}
            </ul>
            <p className="clear mt-6 text-[0.95rem] text-slate" style={{ "--i": 5 } as React.CSSProperties}>
              Villa rates are on request. Tell us your dates and how many of you there are.
            </p>
            <a href="#enquire" data-purpose="villa" className="clear btn btn-ink mt-8" style={{ "--i": 6 } as React.CSSProperties}>
              Ask about a villa
            </a>
          </div>
          <figure className="lg:col-span-7 lg:col-start-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <div className="surface">
                <Photo
                  name="poolPrivate"
                  alt="A private plunge pool against an olive wall, a cold drink and towels on the table beside it"
                  sizes="(min-width: 1024px) 28vw, 50vw"
                  className="aspect-[3/4]"
                />
              </div>
              <div className="surface mt-16" style={{ "--i": 1 } as React.CSSProperties}>
                <Photo
                  name="poolMural2"
                  alt="A plunge pool with a painted landscape on the wall and a chequered floor"
                  sizes="(min-width: 1024px) 28vw, 50vw"
                  className="aspect-[3/4]"
                  imgClassName="object-[30%_50%]"
                />
              </div>
            </div>
            <figcaption className="clear mt-4 text-[0.92rem] text-slate">Private plunge pools at the resort</figcaption>
          </figure>
        </InView>
      </section>

      <section id="inside" aria-labelledby="inside-title" className="scroll-mt-16 bg-stone">
        <InView amount={0.05} className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-32">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <h2 id="inside-title" className="text-[clamp(2.6rem,4.8vw,4.8rem)] lg:col-span-6">
              <Lines lines={["Inside", <>the <em>rooms</em></>]} />
            </h2>
            <p className="clear max-w-sm text-slate lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
              Calm rooms with warm wood, marble floors and private balconies, some with a bath and some with a view
              of the garden.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
            {inside.map((p, i) => (
              <div key={p.name} className={`surface ${p.frame.includes("col-span-2") ? "col-span-2" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                <Photo name={p.name} alt={p.alt} sizes="(min-width: 640px) 50vw, 100vw" className={p.frame.replace("sm:col-span-2", "")} />
              </div>
            ))}
          </div>
        </InView>
      </section>

      <section id="amenities" aria-labelledby="amenities-title" className="scroll-mt-16 bg-mist">
        <InView amount={0.05} className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-32">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <h2 id="amenities-title" className="text-[clamp(2.6rem,4.8vw,4.8rem)] lg:col-span-6">
              <Lines lines={["Around", <>the <em>lawns</em></>]} />
            </h2>
            <p className="clear max-w-sm text-slate lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
              Every package includes the activities and amenities. Children have their own play areas, indoors and out.
            </p>
          </div>
          <ul className="mt-14 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {amenities.map((a, i) => (
              <li key={a.title} className="clear" style={{ "--i": i + 1 } as React.CSSProperties}>
                <div className="surface" style={{ "--i": i } as React.CSSProperties}>
                  <Photo name={a.photo} alt="" sizes="(min-width: 1024px) 24vw, (min-width: 640px) 50vw, 100vw" className="aspect-[4/3]" />
                </div>
                <h3 className="mt-5 text-[1.6rem]">{a.title}</h3>
                <p className="mt-2 text-[0.98rem] text-slate">{a.body}</p>
              </li>
            ))}
          </ul>
        </InView>
      </section>

      <Offers className="border-t border-ink/10" />
      <Enquiry />
    </PageTransition>
  );
}

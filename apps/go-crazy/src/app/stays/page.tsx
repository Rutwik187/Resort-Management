import { Enquiry } from "@/components/enquiry";
import { InView } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { PageTransition } from "@/components/page-transition";
import { Photo } from "@/components/photo";
import { contact, formatRupees, stayFeatures, stays, type CouplePlan, type Stay } from "@/content/resort";
import type { PhotoKey } from "@/content/photos";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({
  title: "Stays",
  description:
    "Laterite stone chira cottages, painted sofa-cum-bed cottages, couple cottages and 2 and 3 BHK villas at Prathamesh Go Crazy, Sinhagad, Pune. Rooms, guests and rates, with meals and activities included.",
  path: "/stays",
});

const alts: Partial<Record<PhotoKey, string>> = {
  chiraPair: "Two red laterite stone cottages with carved white eaves and a palm between them",
  chiraRoom: "A chira cottage room: laterite stone walls, a carved wooden door, a TV and a small table",
  chiraPalms: "A laterite stone cottage between two palms, on a green lawn",
  chiraRoom3: "A double bed under a wooden ceiling, against a laterite stone wall",
  paintedCottage: "A cottage painted with folk art in purple, blue and yellow, under mango trees",
  sofaRoom2: "A bright room with a wooden floor, a TV and a sofa-cum-bed",
  sofaCottage: "A green cottage painted with a camel and folk motifs, with a railed veranda",
  sofaRoom4: "A white room with a wooden floor, a TV on the wall and a wardrobe",
  coupleRoom: "A double bed in a warm yellow room with a painted flower motif above it",
  orangeCottage: "An orange cottage with painted murals and a railed veranda among the trees",
  coupleRoom2: "A double bed and dressing table in a yellow room with a wooden floor",
  coupleRoom3: "A yellow room with a glass door onto the garden, a double bed and a painted motif",
  villa: "Two cottages under tall trees, with a lawn in front",
  villaRoom: "A villa room with two beds, laterite stone walls and a wooden ceiling",
  villaRoom2: "A villa room with twin beds against a laterite stone wall",
  villaRoom3: "A villa room with a wardrobe and a laterite stone wall",
};

export default function StaysPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Stays"
        lines={["Stay", "the night"]}
        photo={{ name: "chiraPalms2", alt: "A red laterite stone cottage with carved white eaves between tall palms, on a green lawn" }}
        facts={[
          { label: "Kinds of stay", value: String(stays.length) },
          { label: "A couple, from", value: formatRupees(Math.min(...stays.flatMap((s) => (s.weekday ? [s.weekday.base] : [])))) },
          { label: "Check-in", value: contact.checkIn },
          { label: "Check-out", value: contact.checkOut },
        ]}
      >
        <p>
          Laterite stone cottages under the palms, painted cottages, cottages for couples and villas for groups. Every
          stay is air-conditioned and includes the activities, the games and meals from separate veg and non-veg
          kitchens.
        </p>
      </PageIntro>

      <nav aria-label="Stays on this page" className="sticky top-[68px] z-30 border-y-2 border-ink bg-chalk md:top-[78px]">
        <ul className="no-scrollbar mx-auto flex max-w-[1600px] gap-x-7 overflow-x-auto px-4 py-3.5 md:px-8">
          {stays.map((stay) => (
            <li key={stay.slug} className="shrink-0">
              <a href={`#${stay.slug}`} className="tap text-[0.98rem] font-bold uppercase tracking-[0.05em] [font-stretch:80%] hover:text-brick">
                {stay.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="bg-bone">
        {stays.map((stay, i) => (
          <StayArticle key={stay.slug} stay={stay} flip={i % 2 === 1} />
        ))}
        <p className="mx-auto max-w-[1600px] px-4 py-14 text-[0.92rem] text-stone md:px-8">
          All rates plus GST, as on the current tariff. Monday to Thursday rates follow the CP plan (the room with
          breakfast). Friday and Saturday rates follow the MAP plan (breakfast and one main meal). Villas have one rate
          per person, every day. Paid activities are extra.
        </p>
      </div>

      <Enquiry defaultPurpose="stay" />
    </PageTransition>
  );
}

function StayArticle({ stay, flip }: { stay: Stay; flip: boolean }) {
  const [lead, ...rest] = stay.photos;
  return (
    <article id={stay.slug} aria-labelledby={`${stay.slug}-title`} className="scroll-mt-32 border-b-2 border-ink">
      <InView amount={0.08} className="mx-auto grid max-w-[1600px] gap-10 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-12 lg:gap-10">
        <div className={`grid gap-3 lg:col-span-7 ${flip ? "lg:order-2 lg:col-start-6" : ""}`}>
          <div className="wipe">
            <Photo name={lead} alt={alts[lead] ?? stay.name} sizes="(min-width: 1024px) 56vw, 100vw" className="aspect-[3/2] rounded-[6px]" />
          </div>
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {rest.slice(0, 2).map((name, j) => (
                <div key={name} className="wipe" style={{ "--i": j + 1 } as React.CSSProperties}>
                  <Photo name={name} alt={alts[name] ?? ""} sizes="(min-width: 1024px) 28vw, 50vw" className="aspect-[4/3] rounded-[6px]" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`lg:col-span-5 ${flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-8"}`}>
          <h2 id={`${stay.slug}-title`} className="up text-[clamp(3rem,5.6vw,5rem)]">
            {stay.name}
          </h2>
          <p className="up lead mt-4" style={{ "--i": 1 } as React.CSSProperties}>
            {stay.line}
          </p>

          <dl className="up mt-7 grid grid-cols-2 border-y-2 border-ink" style={{ "--i": 2 } as React.CSSProperties}>
            <div className="py-3.5 pr-3">
              <dt className="label text-stone">{stay.perPerson ? "Villas" : "Rooms"}</dt>
              <dd className="figure mt-1 text-[2rem]">{stay.units}</dd>
            </div>
            <div className="border-l-2 border-ink py-3.5 pl-4">
              <dt className="label text-stone">Guests</dt>
              <dd className="figure mt-1 text-[2rem]">{stay.guests}</dd>
            </div>
          </dl>

          <RateTable stay={stay} />

          <ul className="up mt-6 flex flex-wrap gap-2 text-[0.88rem]" style={{ "--i": 4 } as React.CSSProperties}>
            {stayFeatures.map((f) => (
              <li key={f} className="rounded-[3px] bg-chalk px-2.5 py-1.5 font-semibold shadow-[inset_0_0_0_1.5px_rgb(14_26_20/0.2)]">
                {f}
              </li>
            ))}
          </ul>

          <div className="up mt-8 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ "--i": 5 } as React.CSSProperties}>
            <a href="#enquire" data-purpose="stay" className="btn btn-ink">
              Ask about this stay <span aria-hidden className="arrow">→</span>
            </a>
            <a href={contact.phone.href} className="link-line text-[0.98rem]">
              Call {contact.phone.display}
            </a>
          </div>
        </div>
      </InView>
    </article>
  );
}

const money = (n?: number) => (n === undefined ? "–" : formatRupees(n));

function RateTable({ stay }: { stay: Stay }) {
  if (stay.perPerson) {
    return (
      <p className="up mt-6 flex items-baseline justify-between gap-4 border-b border-ink/20 pb-4" style={{ "--i": 3 } as React.CSSProperties}>
        <span className="text-stone">Per person, every day</span>
        <span className="figure text-[2.6rem]">{formatRupees(stay.perPerson)}</span>
      </p>
    );
  }
  const columns: { label: string; plan: CouplePlan }[] = [
    { label: "Mon to Thu", plan: stay.weekday! },
    { label: "Fri and Sat", plan: stay.weekend! },
  ];
  const rows: { label: string; get: (p: CouplePlan) => number | undefined }[] = [
    { label: "Per couple", get: (p) => p.base },
    { label: "Extra guest, over 11", get: (p) => p.extraPerson },
    { label: "Child, 5 to 11", get: (p) => p.child5to11 },
    { label: "Child, 3 to 5", get: (p) => p.child3to5 },
  ];
  return (
    <table className="up mt-6 w-full text-left text-[0.96rem]" style={{ "--i": 3 } as React.CSSProperties}>
      <caption className="sr-only">{stay.name} rates, plus GST</caption>
      <thead>
        <tr>
          <th scope="col" className="pb-2 font-normal">
            <span className="sr-only">Rate</span>
          </th>
          {columns.map((c) => (
            <th key={c.label} scope="col" className="label pb-2 text-right font-semibold text-stone">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.label} className="border-t border-ink/15">
            <th scope="row" className={`py-2.5 pr-4 ${i === 0 ? "font-bold" : "font-normal text-stone"}`}>
              {row.label}
            </th>
            {columns.map((c) => (
              <td key={c.label} className={`py-2.5 text-right tabular-nums ${i === 0 ? "figure text-[1.9rem]" : ""}`}>
                {money(row.get(c.plan))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

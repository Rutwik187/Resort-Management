import { contact, formatRupees, stays, type RatePlan, type Stay } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { Enquiry } from "@/components/enquiry";
import { InView } from "@/components/in-view";
import { PageIntro } from "@/components/page-intro";
import { Photo } from "@/components/photo";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Stays",
  description:
    "Riverside glass houses with balcony jacuzzis, a private-pool villa, river view tents, laterite stone cottages and wooden houses near Khed Shivapur, Pune. Rooms, guests and rates for every stay.",
  path: "/stays",
});

export default function StaysPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Stays"
        lines={["Ten ways", "to stay"]}
        photo="glassHouseExterior"
        alt="Glass House cabins with green roofs, raised on stilts among the trees"
      >
        <p>
          From a glass house with a jacuzzi on the balcony to a private-pool villa for thirty. Every stay has
          air conditioning, its own bathroom and meals from our kitchens. Veg and non-veg meals are cooked in separate
          kitchens.
        </p>
        <p className="mt-6 text-[0.95rem]">
          Check-in {contact.checkIn}. Check-out {contact.checkOut}.
        </p>
      </PageIntro>

      <nav aria-label="Stays on this page" className="border-y border-forest/10 bg-linen">
        <ul className="no-scrollbar mx-auto flex max-w-[1680px] gap-x-8 overflow-x-auto px-5 py-5 text-[0.95rem] md:flex-wrap md:px-10">
          {stays.map((stay) => (
            <li key={stay.slug} className="shrink-0">
              <a href={`#${stay.slug}`} className="tap text-fern transition-colors hover:text-forest">
                {stay.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="bg-linen">
        {stays.map((stay, i) => (
          <StayArticle key={stay.slug} stay={stay} flip={i % 2 === 1} />
        ))}
        <p className="mx-auto max-w-[1680px] px-5 pb-24 text-[0.9rem] text-fern md:px-10">
          All rates plus GST, as on our current tariff. Monday to Thursday rates follow the CP plan (room with
          breakfast). Friday and Saturday rates follow the MAP plan (breakfast and one main meal).
        </p>
      </div>

      <Enquiry />
    </PageTransition>
  );
}

function StayArticle({ stay, flip }: { stay: Stay; flip: boolean }) {
  const [lead, ...rest] = stay.photos;
  const supporting = rest.slice(0, 2);
  return (
    <article id={stay.slug} aria-labelledby={`${stay.slug}-title`} className="scroll-mt-20 border-b border-forest/10">
      <InView amount={0.1} className="mx-auto grid max-w-[1680px] gap-10 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-12 lg:gap-10">
        <div className={`grid gap-3 lg:col-span-7 ${flip ? "lg:order-2 lg:col-start-6" : ""}`}>
          <div className="unveil">
            <Photo name={lead} alt={`${stay.name}`} sizes="(min-width: 1024px) 55vw, 100vw" className="aspect-[3/2]" />
          </div>
          {supporting.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {supporting.map((name, j) => (
                <div key={name} className="unveil" style={{ "--i": j + 1 } as React.CSSProperties}>
                  <Photo name={name} alt="" sizes="(min-width: 1024px) 27vw, 50vw" className="aspect-[4/3]" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`lg:col-span-4 ${flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-9"}`}>
          <h2 id={`${stay.slug}-title`} className="fade text-[clamp(2.4rem,4vw,3.8rem)]">
            {stay.name}
          </h2>
          <p className="fade display mt-4 text-[1.35rem] leading-snug text-sun-deep">{stay.line}</p>
          <p className="fade mt-5 text-fern">{stay.description}</p>

          <dl className="fade mt-8 grid grid-cols-2 gap-4 border-t border-forest/12 pt-5 text-[0.95rem]">
            <div>
              <dt className="text-fern">Rooms</dt>
              <dd className="mt-1">{stay.rooms}</dd>
            </div>
            <div>
              <dt className="text-fern">Guests</dt>
              <dd className="mt-1">{stay.guests}</dd>
            </div>
          </dl>

          <RateTable stay={stay} />

          <details className="fade group mt-6 border-t border-forest/12 pt-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[0.95rem] [&::-webkit-details-marker]:hidden">
              What every room includes
              <span aria-hidden className="text-xl transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 pb-2 text-[0.9rem] text-fern">
              {stay.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </details>

          <div className="fade mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="#enquire" className="btn btn-forest">
              Ask about this stay
            </a>
            <a href={contact.bookingPhone.href} className="link-line text-[0.95rem]">
              Call {contact.bookingPhone.display}
            </a>
          </div>
        </div>
      </InView>
    </article>
  );
}

const money = (n: number) => (n === 0 ? "Free" : formatRupees(n));

function RateTable({ stay }: { stay: Stay }) {
  const columns: { label: string; plan: RatePlan }[] = stay.everyDay
    ? [{ label: "Every day", plan: stay.everyDay }]
    : [
        { label: "Mon to Thu", plan: stay.weekday! },
        { label: "Fri and Sat", plan: stay.weekend! },
      ];
  const basis = columns[0].plan.basis;
  const rows: { label: string; get: (p: RatePlan) => number | undefined }[] = [
    { label: basis === "per couple" ? "Per couple" : "Per person", get: (p) => p.base },
    { label: "Extra guest, 11 and over", get: (p) => p.extraPerson },
    { label: "Child, 5 to 11", get: (p) => p.child5to11 },
    { label: "Child, 3 to 5", get: (p) => p.child3to5 },
  ];
  const visibleRows = rows.filter((r) => columns.some((c) => r.get(c.plan) !== undefined));

  return (
    <table className="fade mt-6 w-full border-t border-forest/12 text-left text-[0.95rem]">
      <caption className="sr-only">{stay.name} rates, plus GST</caption>
      <thead>
        <tr className="text-fern">
          <th scope="col" className="py-3 font-normal">
            <span className="sr-only">Rate</span>
          </th>
          {columns.map((c) => (
            <th key={c.label} scope="col" className="py-3 text-right font-normal">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visibleRows.map((row, i) => (
          <tr key={row.label} className="border-t border-forest/8">
            <th scope="row" className={`py-2.5 pr-4 font-normal ${i === 0 ? "" : "text-fern"}`}>
              {row.label}
            </th>
            {columns.map((c) => {
              const value = row.get(c.plan);
              return (
                <td key={c.label} className={`py-2.5 text-right tabular-nums ${i === 0 ? "display text-[1.4rem]" : ""}`}>
                  {value === undefined ? "–" : money(value)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

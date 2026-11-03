import Link from "next/link";
import { contact, cottageFeatures, cottages, packages, type Cottage, type RatePlan } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { Enquiry } from "@/components/enquiry";
import { InView, Words } from "@/components/in-view";
import { Money } from "@/components/money";
import { PackageCard } from "@/components/package-card";
import { PageIntro } from "@/components/page-intro";
import { Photo } from "@/components/photo";
import { PageTransition } from "@/components/page-transition";
import { SectionLabel } from "@/components/section-label";

export const metadata = pageMetadata({
  title: "Cottages and packages",
  description:
    "AC cottages of red laterite stone at Bhilar, Mahabaleshwar: the classic, with a jacuzzi, or with a bath tub. Weekday and weekend rates, and couple, group and full-board packages with every meal included.",
  path: "/stays",
});

const alts: Record<string, string> = {
  roomBright: "A bright cottage room: a wooden double bed with teal cushions, yellow curtains and a mirror",
  roomLaterite: "A cottage room with a red laterite stone wall, a wooden sofa bed and two chairs at a small table",
  roomWardrobe: "A cottage room with a double bed, a wooden wardrobe and yellow curtains",
  cottageFront: "A laterite cottage with a white railing and a carved door, on chequered paving",
  roomJacuzzi: "A cottage room with a laterite wall, a television, and a jacuzzi in an alcove behind curtains",
  jacuzzi: "The jacuzzi tub, with turquoise curtains drawn back",
  roomLateriteTv: "A laterite-walled room with a television, a table and two chairs",
  roomTeal: "A double bed with teal throws, beside a red laterite wall",
  bathtub: "A white bath tub set in dark granite",
  bathtub2: "A bath tub in a white tiled bathroom",
  roomLaterite2: "A room with a laterite wall, a television and a small table",
  veranda: "A cottage veranda with a white railing, plants and a lawn in front",
};

export default function StaysPage() {
  return (
    <PageTransition>
      <PageIntro
        label="Stays"
        title="Cottages of red *stone*"
        photo="cottageFront"
        alt="A laterite cottage with a white railing and a carved door, on chequered paving"
      >
        <p>
          Every cottage is built in lal chira, the red laterite stone of the Konkan, and has air conditioning, a
          television and hot water. Choose a cottage on its own, or a package with every meal included.
        </p>
        <p className="mt-6 text-[0.95rem]">
          Check-in {contact.checkIn}. Check-out {contact.checkOut}. Children under three stay free.
        </p>
      </PageIntro>

      <nav aria-label="On this page" className="border-y border-ink/10 bg-cloud">
        <ul className="no-scrollbar mx-auto flex max-w-[1600px] gap-x-8 overflow-x-auto px-5 py-5 text-[0.95rem] md:flex-wrap md:px-10">
          {cottages.map((c) => (
            <li key={c.slug} className="shrink-0">
              <a href={`#${c.slug}`} className="tap text-moss transition-colors hover:text-ink">
                {c.name}
              </a>
            </li>
          ))}
          <li className="shrink-0">
            <a href="#packages" className="tap text-moss transition-colors hover:text-ink">
              Packages
            </a>
          </li>
        </ul>
      </nav>

      <div className="bg-cloud">
        {cottages.map((cottage, i) => (
          <CottageArticle key={cottage.slug} cottage={cottage} flip={i % 2 === 1} />
        ))}
      </div>

      <section id="packages" aria-labelledby="packages-title" className="scroll-mt-16 bg-mist">
        <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-32">
          <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <SectionLabel className="fade text-moss">Packages</SectionLabel>
              <h2 id="packages-title" className="mt-8 text-[clamp(2.8rem,6vw,6rem)]">
                <Words text="Every *meal* included" />
              </h2>
            </div>
            <p className="fade text-moss lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
              Each package includes the meals, every activity and amenity, and a stay with a television and hot water.
              Veg and non-veg meals come from separate kitchens.
            </p>
          </InView>
          <InView amount={0.1} className="mt-16 grid gap-8 lg:grid-cols-3">
            {packages.map((pkg, i) => (
              <PackageCard key={pkg.slug} pkg={pkg} className="fade" style={{ "--i": i } as React.CSSProperties} />
            ))}
          </InView>
          <div className="mt-16 grid gap-6 border-t border-ink/15 pt-8 text-[0.9rem] text-moss md:grid-cols-2">
            <p>
              All rates plus GST, as on our current tariff. Cottage rates from Monday to Thursday follow the CP plan
              (room with breakfast). Friday and Saturday rates follow the MAP plan (breakfast and one main meal).
            </p>
            <p>
              Children under three stay free. Before you book, please read our{" "}
              <Link href="/policies" className="underline underline-offset-4 hover:text-ink">
                terms and cancellation policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <Enquiry />
    </PageTransition>
  );
}

function CottageArticle({ cottage, flip }: { cottage: Cottage; flip: boolean }) {
  const [lead, ...rest] = cottage.photos;
  const supporting = rest.slice(0, 2);
  return (
    <article id={cottage.slug} aria-labelledby={`${cottage.slug}-title`} className="scroll-mt-20 border-b border-ink/10">
      <InView amount={0.1} className="mx-auto grid max-w-[1600px] gap-10 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-12 lg:gap-10">
        <div className={`grid gap-3 lg:col-span-7 ${flip ? "lg:order-2 lg:col-start-6" : ""}`}>
          <div className="lift">
            <Photo name={lead} alt={alts[lead] ?? cottage.name} sizes="(min-width: 1024px) 55vw, 100vw" className="aspect-[3/2]" />
          </div>
          {supporting.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {supporting.map((name, j) => (
                <div key={name} className="lift" style={{ "--i": j + 1 } as React.CSSProperties}>
                  <Photo name={name} alt={alts[name] ?? ""} sizes="(min-width: 1024px) 27vw, 50vw" className="aspect-[4/3]" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`lg:col-span-4 ${flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-9"}`}>
          <p className="fade label text-laterite">{cottage.feature}</p>
          <h2 id={`${cottage.slug}-title`} className="fade mt-4 text-[clamp(2.4rem,4vw,3.8rem)]">
            {cottage.name}
          </h2>
          <p className="fade lead mt-5">{cottage.line}</p>
          <p className="fade mt-5 text-moss">{cottage.description}</p>

          <RateTable cottage={cottage} />

          <details className="fade group mt-6 border-t border-ink/12 pt-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[0.95rem] [&::-webkit-details-marker]:hidden">
              What every cottage includes
              <span aria-hidden className="text-xl transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 pb-2 text-[0.9rem] text-moss">
              {[...cottageFeatures, cottage.guests, "Separate veg and non-veg kitchens"].map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </details>

          <div className="fade mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="#enquire" className="btn btn-ink">
              Ask about this cottage <span aria-hidden className="btn-arrow">→</span>
            </a>
            <a href={contact.phone.href} className="arrow-link text-[0.95rem]">
              Call {contact.phone.display}
            </a>
          </div>
        </div>
      </InView>
    </article>
  );
}

function RateTable({ cottage }: { cottage: Cottage }) {
  const columns: { label: string; plan: RatePlan }[] = [
    { label: "Mon to Thu", plan: cottage.weekday },
    { label: "Fri and Sat", plan: cottage.weekend },
  ];
  const rows: { label: string; get: (p: RatePlan) => number | undefined }[] = [
    { label: "Per couple", get: (p) => p.base },
    { label: "Extra guest, above 11", get: (p) => p.extraPerson },
    { label: "Child, 5 to 11", get: (p) => p.child5to11 },
    { label: "Child, 3 to 5", get: (p) => p.child3to5 },
  ];
  const visibleRows = rows.filter((r) => columns.some((c) => r.get(c.plan) !== undefined));

  return (
    <table className="fade mt-8 w-full border-t border-ink/12 text-left text-[0.95rem]">
      <caption className="sr-only">{cottage.name} rates, plus GST</caption>
      <thead>
        <tr className="text-moss">
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
          <tr key={row.label} className="border-t border-ink/8">
            <th scope="row" className={`py-2.5 pr-4 font-normal ${i === 0 ? "" : "text-moss"}`}>
              {row.label}
            </th>
            {columns.map((c) => {
              const value = row.get(c.plan);
              return (
                <td key={c.label} className={`py-2.5 text-right tabular-nums ${i === 0 ? "display text-[1.4rem]" : ""}`}>
                  {value === undefined ? <span aria-label="Not listed">–</span> : <Money amount={value} />}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { liveOffers } from "@repo/website";
import { resortOf, resorts } from "@/content/resorts";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({ title: "Offers", description: "Every live offer at the four Prathamesh resorts, with terms and dates.", path: "/offers" });

/** Every live offer at the four resorts, filterable by resort (URD 4.1). */
export default function OffersPage({ searchParams }: PageProps<"/offers">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 md:px-8">
      <h1 className="display text-[clamp(2.4rem,5vw,4rem)] text-forest">Offers</h1>
      <p className="mt-3 max-w-2xl text-muted">Offers apply by themselves when you book on the resort&apos;s site, one per booking.</p>
      <Suspense fallback={null}>
        <List searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/offers">["searchParams"] }) {
  const pick = resortOf(String((await searchParams).resort ?? ""))?.code;
  const shown = pick ? resorts.filter((r) => r.code === pick) : resorts;
  const all = (await Promise.all(shown.map(async (r) => (await liveOffers(r.code)).map((o) => ({ ...o, resort: r }))))).flat();
  return (
    <>
      <nav aria-label="Resort" className="mt-6 flex flex-wrap gap-2">
        {[{ code: "", shortName: "All resorts" }, ...resorts].map((r) => (
          <Link key={r.code || "all"} href={r.code ? `/offers?resort=${r.code}` : "/offers"} aria-current={(pick ?? "") === r.code ? "page" : undefined} className={`rounded-full px-4 py-2 text-[0.95rem] ${(pick ?? "") === r.code ? "bg-forest text-white" : "border border-ink/15"}`}>
            {r.shortName}
          </Link>
        ))}
      </nav>
      {all.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-ink/20 p-8 text-muted">No offers just now.</p>
      ) : (
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {all.map((offer) => (
            <li key={`${offer.resort.code}-${offer.title}`} className="flex flex-col rounded-3xl bg-white p-6">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-clay">
                {offer.resort.shortName} · {offer.label}
              </p>
              <h2 className="display mt-2 text-[1.7rem] leading-tight">{offer.title}</h2>
              {offer.details && <p className="mt-2 text-muted">{offer.details}</p>}
              {offer.code && (
                <p className="mt-3">
                  Code <span className="ml-1 rounded-full border border-dashed border-ink px-3 py-1 font-mono font-semibold">{offer.code}</span>
                </p>
              )}
              <ul className="mt-4 grid gap-1 border-t border-ink/10 pt-3 text-[0.9rem] text-muted">
                {offer.terms.map((t) => (
                  <li key={t}>· {t}</li>
                ))}
              </ul>
              <a href={`${offer.resort.url}/stays`} className="mt-5 inline-flex min-h-11 items-center self-start rounded-full bg-forest px-5 text-white">
                Book at {offer.resort.shortName}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

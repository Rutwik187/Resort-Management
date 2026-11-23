import { Suspense } from "react";
import Image from "next/image";
import { getDb } from "@repo/db";
import { groupDaySearch, groupStaySearch, isDate } from "@repo/engine";
import { SearchForm } from "@/components/search-form";
import { photos, resortOf, resorts, rupees } from "@/content/resorts";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({ title: "Find a stay or a day out", description: "What is free at every Prathamesh resort for your dates and guests, with prices. Book on the resort's own site.", path: "/search" });

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const count = (v: string | undefined, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};
const longDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/**
 * The group's search results (URD 4.1): what is free at each resort for the
 * dates and guests, sorted by resort. Booking hands over to the resort's own
 * site with the same dates and guests, where payment goes to that resort's
 * company (PAY-04). One booking is for one resort (BK-08).
 */
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 md:px-8">
      <h1 className="display text-[clamp(2.2rem,4vw,3.4rem)] text-forest">Find a stay or a day out</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Looking at every resort…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const q = await searchParams;
  const kind = one(q.kind) === "day" ? "day" : "stay";
  const resort = resortOf(one(q.resort) ?? "")?.code;
  const adults = count(one(q.adults), 1, kind === "stay" ? 12 : 200, 2);
  const children = count(one(q.children), 0, kind === "stay" ? 8 : 200, 0);
  const checkIn = one(q.in) ?? "";
  const checkOut = one(q.out) ?? "";
  const day = one(q.day) ?? "";
  const asked = kind === "stay" ? isDate(checkIn) && isDate(checkOut) && checkOut > checkIn : isDate(day);
  const form = <SearchForm compact resorts={resorts.map((r) => ({ code: r.code, name: r.name }))} initial={{ kind, checkIn, checkOut, day, adults, children, resort }} />;
  if (!asked || !process.env.DATABASE_URL) {
    return <div className="mt-6">{form}</div>;
  }
  const party = `${adults} ${adults === 1 ? "adult" : "adults"}${children ? `, ${children} ${children === 1 ? "child" : "children"}` : ""}`;
  const handoff = (code: string) => {
    const site = resortOf(code)!;
    const url = site.url;
    if (kind === "day" && !site.dayPackagesPage) return url;
    const params = new URLSearchParams(kind === "stay" ? { in: checkIn, out: checkOut, adults: String(adults), children: String(children), rooms: "1" } : { date: day });
    return `${url}/${kind === "stay" ? "stays" : "day-packages"}?${params}`;
  };

  if (kind === "stay") {
    const results = await groupStaySearch(getDb(), { checkIn, checkOut, adults, children, propertyCode: resort });
    const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
    return (
      <>
        <div className="mt-6">{form}</div>
        <p className="mt-8 text-muted">
          {longDay(checkIn)} to {longDay(checkOut)}, {nights} {nights === 1 ? "night" : "nights"}, {party} a room. Prices are for one room, before GST. Rooms at two resorts are two bookings, each paid to its own resort.
        </p>
        {results.length === 0 && <p className="mt-6 rounded-2xl border border-dashed border-ink/20 p-8 text-muted">No resort has rooms set up for these dates yet. Call us, or try other dates.</p>}
        <div className="mt-6 grid gap-8">
          {results.map((result) => (
            <section key={result.propertyCode} aria-labelledby={`r-${result.propertyCode}`} className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_40px_-30px_rgb(0_0_0/0.4)]">
              <div className="grid md:grid-cols-[18rem_1fr]">
                <Image src={photos[result.propertyCode].src} alt={photos[result.propertyCode].alt} className="h-44 w-full object-cover md:h-full" sizes="(min-width: 768px) 18rem, 100vw" />
                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 id={`r-${result.propertyCode}`} className="display text-[1.8rem]">
                      {result.propertyName}
                    </h2>
                    <a href={handoff(result.propertyCode)} className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-white hover:bg-forest-soft">
                      Book at {resortOf(result.propertyCode)!.shortName}
                    </a>
                  </div>
                  <ul className="mt-4 divide-y divide-ink/10">
                    {result.options.map((o) => (
                      <li key={o.code} className={`flex flex-wrap items-center justify-between gap-3 py-2.5 ${o.free === 0 ? "text-muted" : ""}`}>
                        <span className="font-medium">{o.name}</span>
                        <span className="text-right text-[0.95rem]">
                          {o.free === 0 ? (
                            <span>{o.note ?? "Sold out for these dates"}</span>
                          ) : (
                            <>
                              {o.totalPaise !== null ? <span className="font-semibold">{rupees(o.totalPaise)}</span> : <span>Rate on request</span>}
                              <span className="ml-2 text-muted">
                                {o.free <= 2 ? `${o.free} left` : "Available"}
                                {o.note ? ` · ${o.note}` : ""}
                              </span>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </div>
      </>
    );
  }

  const results = await groupDaySearch(getDb(), { day, adults, children, propertyCode: resort });
  return (
    <>
      <div className="mt-6">{form}</div>
      <p className="mt-8 text-muted">
        {longDay(day)}, {party}. Prices are for the whole party, before GST.
      </p>
      {results.length === 0 && <p className="mt-6 rounded-2xl border border-dashed border-ink/20 p-8 text-muted">No day packages for that day. Try another date.</p>}
      <div className="mt-6 grid gap-6">
        {results.map((result) => (
          <section key={result.propertyCode} className="rounded-3xl bg-white p-5 shadow-[0_20px_40px_-30px_rgb(0_0_0/0.4)] md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="display text-[1.8rem]">{result.propertyName}</h2>
              <a href={handoff(result.propertyCode)} className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-white hover:bg-forest-soft">
                Book at {resortOf(result.propertyCode)!.shortName}
              </a>
            </div>
            <ul className="mt-4 divide-y divide-ink/10">
              {result.options.map((o) => (
                <li key={o.code} className={`flex flex-wrap items-center justify-between gap-3 py-2.5 ${o.left === 0 ? "text-muted" : ""}`}>
                  <span>
                    <span className="font-medium">{o.name}</span> <span className="text-muted">· {o.slot}</span>
                  </span>
                  <span className="text-[0.95rem]">
                    {o.left === 0 ? (o.note ?? "Full") : o.totalPaise !== null ? <span className="font-semibold">{rupees(o.totalPaise)}</span> : "Rate on request"}
                    {o.left !== null && o.left > 0 && o.left <= 20 && <span className="ml-2 text-muted">{o.left} places left</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

import { Suspense } from "react";
import Image from "next/image";
import { liveFromPrice } from "@repo/website";
import { photos, resorts, rupees } from "@/content/resorts";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({ title: "Our resorts", description: "The four Prathamesh resorts: Khed Shivapur, Go Crazy and Sinhagad Bliss near Pune, and Valley Resorts in Mahabaleshwar.", path: "/resorts" });

/** One card per resort with its photo, place, what it is known for, its lowest rate and a link to its site (URD 4.1). */
export default function ResortsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 md:px-8">
      <h1 className="display text-[clamp(2.4rem,5vw,4rem)] text-forest">Our resorts</h1>
      <p className="mt-3 max-w-2xl text-muted">Each resort is its own company with its own site, where you book and pay. The group site helps you choose.</p>
      <div className="mt-10 grid gap-8">
        {resorts.map((r) => (
          <article key={r.code} className="grid overflow-hidden rounded-3xl bg-white md:grid-cols-2">
            <Image src={photos[r.code].src} alt={photos[r.code].alt} className="h-64 w-full object-cover md:h-full" sizes="(min-width: 768px) 50vw, 100vw" />
            <div className="p-6 md:p-10">
              <p className="text-[0.85rem] uppercase tracking-[0.14em] text-clay">{r.place}</p>
              <h2 className="display mt-2 text-[2.4rem] leading-tight">{r.name}</h2>
              <p className="mt-3 text-[1.05rem]">{r.pitch}.</p>
              <ul className="mt-4 flex flex-wrap gap-2 text-[0.9rem]">
                {r.staySections.map((s) => (
                  <li key={s.id} className="rounded-full bg-stone px-3 py-1">
                    {s.title}
                  </li>
                ))}
                {r.dayPackagesPage && <li className="rounded-full bg-stone px-3 py-1">Day packages</li>}
              </ul>
              <Suspense fallback={null}>
                <FromPrice code={r.code} />
              </Suspense>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={r.url} className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-white hover:bg-forest-soft">
                  Visit the site
                </a>
                <a href={`${r.url}/stays`} className="inline-flex min-h-11 items-center rounded-full border border-forest/30 px-5 text-forest">
                  Rooms and rates
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

async function FromPrice({ code }: { code: string }) {
  const price = await liveFromPrice(code as "KS");
  if (!price) return null;
  return (
    <p className="mt-4">
      From <span className="font-semibold">{rupees(price.paise)}</span> <span className="text-muted">{price.basis === "person" ? "a person" : "a couple"}, a night, plus GST</span>
    </p>
  );
}

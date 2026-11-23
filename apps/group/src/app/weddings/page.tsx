import Image from "next/image";
import { WeddingForm } from "@/components/wedding-form";
import { photos, resorts } from "@/content/resorts";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({ title: "Weddings and events", description: "Weddings and events at the four Prathamesh resorts near Pune and in Mahabaleshwar. Send one enquiry to the resort you like.", path: "/weddings" });

/** Venues across the group and the wedding enquiry, which becomes a lead at the resort chosen (URD 4.1). */
export default function WeddingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 md:px-8">
      <p className="text-[0.85rem] font-medium uppercase tracking-[0.16em] text-clay">Weddings and events</p>
      <h1 className="display mt-3 max-w-3xl text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.04] text-forest">Celebrate with the whole family, at the resort you love.</h1>
      <p className="mt-4 max-w-2xl text-[1.05rem] text-muted">Each resort has lawns, halls and rooms for guests. Tell us the date and how many are coming; the resort&apos;s events team calls you with venues and a quote.</p>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {resorts.map((r) => (
          <li key={r.code} className="overflow-hidden rounded-3xl bg-white">
            <Image src={photos[r.code].src} alt={photos[r.code].alt} className="aspect-[4/3] w-full object-cover" sizes="(min-width: 1024px) 25vw, 50vw" />
            <div className="p-5">
              <p className="display text-[1.35rem]">{r.name}</p>
              <p className="text-[0.9rem] text-muted">{r.place}</p>
              <a href={`${r.url}/celebrations`} className="mt-3 inline-block text-forest underline underline-offset-4">
                Its venues and gallery
              </a>
            </div>
          </li>
        ))}
      </ul>
      <section aria-labelledby="enquire" className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 id="enquire" className="display text-[2.2rem] text-forest">
            Send an enquiry
          </h2>
          <p className="mt-3 text-muted">One enquiry, to the resort you choose. You can ask us to compare resorts in the note.</p>
        </div>
        <WeddingForm resorts={resorts.map((r) => ({ code: r.code, name: `${r.name}, ${r.place}` }))} />
      </section>
    </div>
  );
}

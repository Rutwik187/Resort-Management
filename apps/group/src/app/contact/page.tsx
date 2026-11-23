import { Suspense } from "react";
import { liveCompany } from "@repo/website";
import { resorts } from "@/content/resorts";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({ title: "Contact", description: "How to reach each Prathamesh resort.", path: "/contact" });

/** Each resort's contacts, its own site and its map (URD 4.1: About, Contact). */
export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 md:px-8">
      <h1 className="display text-[clamp(2.4rem,5vw,4rem)] text-forest">Contact</h1>
      <p className="mt-3 max-w-2xl text-muted">The Prathamesh Group runs four resorts in the Sahyadri. Each has its own team; reach the one you are visiting.</p>
      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        {resorts.map((r) => (
          <li key={r.code} className="rounded-3xl bg-white p-6">
            <h2 className="display text-[1.7rem]">{r.name}</h2>
            <p className="text-muted">{r.place}</p>
            <Suspense fallback={null}>
              <Company code={r.code} />
            </Suspense>
            <a href={r.url} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-forest/30 px-4 text-forest">
              Phone, WhatsApp and map on its site
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function Company({ code }: { code: string }) {
  const company = await liveCompany(code as "KS");
  if (!company) return null;
  return (
    <dl className="mt-3 grid gap-1 text-[0.95rem]">
      <dd className="font-medium">{company.legalName}</dd>
      {company.address && <dd className="text-muted">{company.address}</dd>}
      {company.phone && (
        <dd>
          <a href={`tel:+${company.phone}`} className="underline underline-offset-4">
            +{company.phone}
          </a>
        </dd>
      )}
      {company.email && (
        <dd>
          <a href={`mailto:${company.email}`} className="underline underline-offset-4">
            {company.email}
          </a>
        </dd>
      )}
    </dl>
  );
}

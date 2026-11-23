import { properties } from "@repo/sites";
import { contact } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";
import { CorporateForm } from "./form";

export const metadata = pageMetadata({
  title: "Corporate offsites and events",
  description: "Offsites, team outings, conferences, training and day events at Prathamesh Resorts, Khed Shivapur. Send a corporate enquiry and the team quotes.",
  path: "/corporate",
});

const offerings = [
  { title: "Offsites and team outings", text: "Overnight stays for teams, with meals, games and activities planned around your days." },
  { title: "Conferences and training", text: "Meeting space with the audio and video you need, tea breaks and meals for your group." },
  { title: "Day events", text: "A day out for your team, from morning arrival to evening, with meals and activities." },
  { title: "Large groups", text: "More rooms than the website books at once? Ask here: the team holds the rooms and quotes." },
];

/** The corporate section (CRP-01) and enquiry (CRP-02, CRP-05). Enquiries become Corporate leads in the admin. */
export default function CorporatePage() {
  const resorts = [...properties].sort((a, b) => Number(b.code === "KS") - Number(a.code === "KS")).map((p) => ({ code: p.code, name: `${p.name}, ${p.place}` }));
  return (
    <PageTransition>
      <header className="mx-auto max-w-[1680px] px-5 pb-12 pt-28 md:px-10 md:pt-36">
        <p className="label text-fern">Corporate</p>
        <h1 className="mt-6 max-w-4xl text-[clamp(2.8rem,5.4vw,5.4rem)]">
          Offsites, outings and <em>conferences</em>
        </h1>
        <p className="mt-6 max-w-xl text-fern">
          Tell us your dates, your group and what the days need. The team replies with options and a quote, and can issue the GST invoice in your company&apos;s name.
        </p>
      </header>
      <div className="mx-auto max-w-[1680px] px-5 pb-24 md:px-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <ul className="grid content-start gap-6">
          {offerings.map((item) => (
            <li key={item.title}>
              <h2 className="text-[1.5rem] leading-tight">{item.title}</h2>
              <p className="mt-2 text-fern">{item.text}</p>
            </li>
          ))}
        </ul>
        <CorporateForm resorts={resorts} whatsapp={{ number: contact.whatsapp.number, display: contact.whatsapp.display }} />
      </div>
    </PageTransition>
  );
}

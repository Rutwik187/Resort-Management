import { resorts } from "@/content/resorts";
import { pageMetadata } from "@/content/site";
import { CorporateForm } from "./form";

export const metadata = pageMetadata({ title: "Corporate offsites and events", description: "Offsites, team outings, conferences, training and day events at the four Prathamesh resorts. One enquiry, and the team quotes.", path: "/corporate" });

const offerings = [
  ["Offsites and team outings", "Overnight stays with meals, games and activities planned around your days."],
  ["Conferences and training", "Meeting space with the audio and video you need, tea breaks and meals."],
  ["Day events", "A day out for the team, from morning to evening, with meals and activities."],
  ["Large groups", "More rooms than a website books at once? The team holds the rooms and quotes."],
];

/** The group's corporate section (CRP-01) and enquiry (CRP-02, CRP-05). */
export default function CorporatePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 md:px-8">
      <p className="text-[0.85rem] font-medium uppercase tracking-[0.16em] text-forest">Corporate</p>
      <h1 className="display mt-3 max-w-3xl text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.04] text-forest">Take the team out of the city.</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <ul className="grid content-start gap-6">
          {offerings.map(([title, text]) => (
            <li key={title}>
              <h2 className="display text-[1.5rem]">{title}</h2>
              <p className="mt-1 text-muted">{text}</p>
            </li>
          ))}
          <li className="text-[0.95rem] text-muted">The GST invoice can be in your company&apos;s name: add its GSTIN when you book or enquire.</li>
        </ul>
        <CorporateForm resorts={resorts.map((r) => ({ code: r.code, name: `${r.name}, ${r.place}` }))} />
      </div>
    </div>
  );
}

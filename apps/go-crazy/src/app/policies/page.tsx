import Link from "next/link";
import { Enquiry } from "@/components/enquiry";
import { InView, SnapLines } from "@/components/in-view";
import { PageTransition } from "@/components/page-transition";
import { contact, entryTerms, houseRules, meals, paymentTerms, poolRules, safetyRules } from "@/content/resort";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata({
  title: "Rules and policies",
  description:
    "Park rules, safety, pool dress code, meal times, tickets, cancellation and payment terms at Prathamesh Go Crazy Adventure Park & Resort, Sinhagad, Pune.",
  path: "/policies",
});

const sections = [
  { id: "rules", title: "Park rules", items: houseRules },
  { id: "safety", title: "Safety on the rides", items: safetyRules },
  { id: "pools", title: "In the pools", items: poolRules },
  { id: "terms", title: "Tickets, entry and cancellation", items: entryTerms },
  { id: "payment", title: "Payments", items: paymentTerms },
];

export default function PoliciesPage() {
  return (
    <PageTransition>
      <InView as="header" amount={0.05} className="border-b-2 border-ink bg-chalk">
        <div className="mx-auto grid max-w-[1600px] gap-8 px-4 pb-14 pt-28 md:px-8 md:pb-20 md:pt-36 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="up label marker marker-lime">The small print</p>
            <h1 className="mt-6 text-[clamp(4rem,12.5vw,12rem)]">
              <SnapLines lines={["Rules and", "policies"]} />
            </h1>
          </div>
          <p className="up text-stone lg:col-span-4 lg:pb-3" style={{ "--i": 2 } as React.CSSProperties}>
            The rules keep the park safe and pleasant for everyone. Please read them before you come, and ask our
            office if anything is unclear.
          </p>
        </div>
        <nav aria-label="On this page" className="mx-auto max-w-[1600px] px-4 pb-6 md:px-8">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem]">
            {[...sections, { id: "meals", title: "Meal times" }, { id: "privacy", title: "Your details" }].map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="link-line">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </InView>

      <div className="bg-chalk">
        {sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-20 border-b border-ink/20">
            <InView amount={0.1} className="mx-auto grid max-w-[1600px] gap-6 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-12 lg:gap-10">
              <h2 id={`${section.id}-title`} className="up text-[clamp(2.6rem,4.6vw,4.2rem)] lg:col-span-4">
                {section.title}
              </h2>
              <ol className="grid gap-3.5 lg:col-span-7 lg:col-start-6">
                {section.items.map((item, i) => (
                  <li key={item} className="up flex gap-4 text-[1.02rem]" style={{ "--i": i } as React.CSSProperties}>
                    <span className="figure w-7 shrink-0 pt-0.5 text-[1.25rem] text-brick">{String(i + 1).padStart(2, "0")}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </InView>
          </section>
        ))}

        <section id="meals" aria-labelledby="meals-title" className="scroll-mt-20 border-b border-ink/20">
          <InView amount={0.1} className="mx-auto grid max-w-[1600px] gap-6 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-12 lg:gap-10">
            <h2 id="meals-title" className="up text-[clamp(2.6rem,4.6vw,4.2rem)] lg:col-span-4">
              Meal times
            </h2>
            <div className="lg:col-span-7 lg:col-start-6">
              <dl className="up grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {meals.map((meal) => (
                  <div key={meal.id} className="border-t-2 border-ink pt-3">
                    <dt className="font-bold">{meal.label}</dt>
                    <dd className="text-[0.95rem] tabular-nums text-stone">{meal.time}</dd>
                  </div>
                ))}
              </dl>
              <p className="up mt-6 text-[1.02rem]" style={{ "--i": 1 } as React.CSSProperties}>
                Meals come from separate veg and non-veg kitchens and dining halls. Please don&apos;t ask for a meal
                after its time. Which meals your pass includes is on the{" "}
                <Link href="/day-packages" className="link-line">
                  day passes page
                </Link>
                .
              </p>
            </div>
          </InView>
        </section>

        {/* Describes only what this website does. Update it when analytics, ads or online payment arrive. */}
        <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-20">
          <InView amount={0.1} className="mx-auto grid max-w-[1600px] gap-6 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-12 lg:gap-10">
            <h2 id="privacy-title" className="up text-[clamp(2.6rem,4.6vw,4.2rem)] lg:col-span-4">
              Your details
            </h2>
            <div className="up grid gap-4 text-[1.02rem] lg:col-span-7 lg:col-start-6">
              <p>
                This website has no accounts and does not store what you type into its forms. The enquiry form opens
                WhatsApp on your own phone or computer with your message filled in. Nothing is sent until you press
                send in WhatsApp, and from then on WhatsApp&apos;s own privacy policy applies.
              </p>
              <p>
                The site sets no cookies of its own and runs no tracking or advertising scripts. For any question
                about your details, write to{" "}
                <a href={`mailto:${contact.email}`} className="link-line">
                  {contact.email}
                </a>
                .
              </p>
            </div>
          </InView>
        </section>
      </div>

      <Enquiry />
    </PageTransition>
  );
}

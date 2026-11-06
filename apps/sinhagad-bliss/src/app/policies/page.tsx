import { faqs, policySections } from "@repo/sanity";
import { RichText } from "@repo/sanity/rich-text";
import { contact } from "@/content/resort";
import { policies } from "@/content/policies";
import { pageMetadata } from "@/content/site";
import { InView } from "@/components/in-view";
import { Lines } from "@/components/lines";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Policies",
  description: "The cancellation, refund, terms and privacy policies of Sinhagad Bliss, as published.",
  path: "/policies",
});

export default async function PoliciesPage() {
  const [fromSanity, questions] = await Promise.all([policySections("SB"), faqs("SB")]);
  const navItems = [
    ...(questions.length ? [{ id: "questions", title: "Questions" }] : []),
    // The page's own text shows until editors publish the policies in Sanity.
    ...(fromSanity.length ? fromSanity.map((s) => ({ id: s.anchor, title: s.title })) : policies),
  ];
  return (
    <PageTransition>
      <InView as="header" amount={0.05} className="bg-mist">
        <div className="mx-auto max-w-[1560px] px-5 pb-16 pt-36 md:px-10 md:pb-20 md:pt-48">
          <p className="clear kicker text-slate">Sinhagad Bliss</p>
          <h1 className="mt-8 text-[clamp(3.2rem,8vw,8rem)] leading-[0.98]">
            <Lines lines={[<><em>Policies</em></>]} start={1} />
          </h1>
          <p className="clear mt-8 max-w-xl text-slate" style={{ "--i": 2 } as React.CSSProperties}>
            How cancellations, refunds, bookings and your information are handled. For anything not covered here, call{" "}
            <a href={contact.phone.href} className="link-under tabular-nums text-ink">
              {contact.phone.display}
            </a>{" "}
            or write to{" "}
            <a href={`mailto:${contact.email}`} className="link-under text-ink">
              {contact.email}
            </a>
            .
          </p>
        </div>
      </InView>

      <div className="bg-mist">
        <div className="mx-auto grid max-w-[1560px] gap-12 border-t border-ink/10 px-5 pb-28 pt-12 md:px-10 lg:grid-cols-12 lg:gap-10">
          <nav aria-label="Policies on this page" className="lg:col-span-3">
            <ul className="flex flex-wrap gap-x-6 gap-y-1 lg:sticky lg:top-28 lg:flex-col">
              {navItems.map((p) => (
                <li key={p.id}>
                  <a href={`#${p.id}`} className="kicker flex min-h-11 items-center text-slate transition-colors hover:text-ink">
                    {p.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid max-w-[46rem] gap-20 lg:col-span-8 lg:col-start-5">
            {questions.length > 0 && (
              <section id="questions" aria-labelledby="questions-title" className="scroll-mt-28">
                <h2 id="questions-title" className="text-[clamp(2.2rem,3.6vw,3.4rem)]">
                  Questions <em>guests</em> ask
                </h2>
                <div className="mt-8 border-t border-ink/15">
                  {questions.map((q) => (
                    <details key={q._id} className="group border-b border-ink/15">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-[1.1rem] [&::-webkit-details-marker]:hidden">
                        {q.question}
                        <span aria-hidden className="text-[1.4rem] leading-none text-apricot-deep transition-transform duration-300 group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <RichText value={q.answer} className="pb-6 text-slate" />
                    </details>
                  ))}
                </div>
              </section>
            )}

            {fromSanity.length > 0 ? (
              fromSanity.map((section) => (
                <section key={section._key} id={section.anchor} aria-labelledby={`${section.anchor}-title`} className="scroll-mt-28">
                  <h2 id={`${section.anchor}-title`} className="text-[clamp(2.2rem,3.6vw,3.4rem)]">
                    {section.title}
                  </h2>
                  <RichText value={section.body} className="mt-8 border-t border-ink/15 pt-8 text-[1rem] leading-relaxed text-slate" />
                </section>
              ))
            ) : (
              <>
                {policies.map((policy) => (
                  <section key={policy.id} id={policy.id} aria-labelledby={`${policy.id}-title`} className="scroll-mt-28">
                    <h2 id={`${policy.id}-title`} className="text-[clamp(2.2rem,3.6vw,3.4rem)]">
                      {policy.title}
                    </h2>
                    {policy.updated && <p className="kicker mt-4 text-slate">{policy.updated}</p>}
                    <div className="mt-8 grid gap-7 border-t border-ink/15 pt-8 text-[1rem] leading-relaxed">
                      {policy.blocks.map((block, i) => (
                        <div key={i}>
                          {block.heading && <h3 className="mb-3 text-[1.25rem] font-normal tracking-normal">{block.heading}</h3>}
                          {block.paragraphs?.map((para) => (
                            <p key={para} className="mt-3 text-slate first:mt-0">
                              {para}
                            </p>
                          ))}
                          {block.list && (
                            <ul className="mt-3 grid gap-2.5 text-slate">
                              {block.list.map((item) => (
                                <li key={item} className="flex gap-3">
                                  <span aria-hidden className="mt-[0.8em] h-px w-3 shrink-0 bg-ink/40" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

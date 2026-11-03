import { contact } from "@/content/resort";
import { policies } from "@/content/policies";
import { pageMetadata } from "@/content/site";
import { InView, Lines } from "@/components/in-view";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Policies",
  description: "The cancellation, refund, terms and privacy policies of Sinhagad Bliss, as published.",
  path: "/policies",
});

export default function PoliciesPage() {
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
              {policies.map((p) => (
                <li key={p.id}>
                  <a href={`#${p.id}`} className="kicker flex min-h-11 items-center text-slate transition-colors hover:text-ink">
                    {p.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid max-w-[46rem] gap-20 lg:col-span-8 lg:col-start-5">
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
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

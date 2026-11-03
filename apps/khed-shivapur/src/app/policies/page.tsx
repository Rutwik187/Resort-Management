import { cancellation, privacy, terms } from "@/content/policies";
import { contact } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Cancellation, terms and privacy",
  description: "The cancellation policy, the terms of use and the privacy policy of Prathamesh Resorts, Khed Shivapur, Pune.",
  path: "/policies",
});

const sections = [
  { id: "cancellation", title: "Cancellation" },
  { id: "terms", title: "Terms of use" },
  { id: "privacy", title: "Privacy policy" },
];

export default function PoliciesPage() {
  return (
    <PageTransition>
      <div className="bg-paper">
        <header className="mx-auto max-w-[1680px] px-5 pb-14 pt-28 md:px-10 md:pb-20 md:pt-36">
          <p className="label text-fern">Policies</p>
          <h1 className="mt-6 max-w-4xl text-[clamp(2.8rem,5.4vw,5.4rem)]">
            Cancellation, terms and <em>privacy</em>
          </h1>
          <p className="mt-6 max-w-xl text-fern">
            The fine print, in plain words. Questions? Call {contact.bookingPhone.display}, or write to{" "}
            <a href={`mailto:${contact.email}`} className="link-line text-forest">
              {contact.email}
            </a>
            .
          </p>
          <nav aria-label="On this page" className="mt-10 flex flex-wrap gap-3">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="btn btn-ghost min-h-11 px-5 py-2 text-[0.88rem]">
                {s.title}
              </a>
            ))}
          </nav>
        </header>

        <div className="mx-auto grid max-w-[1680px] gap-20 border-t border-forest/10 px-5 py-20 md:px-10 md:py-28">
          <section id="cancellation" aria-labelledby="cancellation-title" className="grid scroll-mt-24 gap-8 lg:grid-cols-12">
            <h2 id="cancellation-title" className="text-[clamp(2rem,3.4vw,3.2rem)] lg:col-span-4">
              Cancellation
            </h2>
            <ul className="grid gap-4 lg:col-span-7 lg:col-start-6">
              {cancellation.map((line) => (
                <li key={line} className="flex gap-5 border-b border-forest/10 pb-4">
                  <span aria-hidden className="mt-[0.8em] h-px w-4 shrink-0 bg-sun-deep" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <section id="terms" aria-labelledby="terms-title" className="grid scroll-mt-24 gap-8 lg:grid-cols-12">
            <h2 id="terms-title" className="text-[clamp(2rem,3.4vw,3.2rem)] lg:col-span-4">
              Terms of use
            </h2>
            <ol className="grid gap-4 lg:col-span-7 lg:col-start-6">
              {terms.map((line, i) => (
                <li key={line} className="flex gap-5 border-b border-forest/10 pb-4">
                  <span className="label w-6 shrink-0 pt-1 tabular-nums text-sun-deep">{String(i + 1).padStart(2, "0")}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="privacy" aria-labelledby="privacy-title" className="grid scroll-mt-24 gap-8 lg:grid-cols-12">
            <h2 id="privacy-title" className="text-[clamp(2rem,3.4vw,3.2rem)] lg:col-span-4">
              Privacy policy
            </h2>
            <div className="grid gap-10 lg:col-span-7 lg:col-start-6">
              {privacy.map((block) => (
                <div key={block.title}>
                  <h3 className="text-[1.6rem]">{block.title}</h3>
                  <div className="mt-3 grid gap-3 text-fern">
                    {block.body.map((para) => (
                      <p key={para}>{para}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}

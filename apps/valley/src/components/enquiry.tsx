import { contact } from "@/content/resort";
import { ContactList } from "./contact-list";
import { EnquiryForm, type Purpose } from "./enquiry-form";
import { InView, Words } from "./in-view";
import { Postmark, Stamp } from "./postcard";

/**
 * The enquiry section at the foot of every page, written on a postcard.
 * With scripts on, links to #enquire open the same form in the booking drawer
 * instead (booking-drawer.tsx).
 */
export function Enquiry({ defaultPurpose = "stay" }: { defaultPurpose?: Purpose }) {
  return (
    <section id="enquire" aria-labelledby="enquire-title" className="scroll-mt-0 bg-cloud text-ink">
      <InView className="mx-auto grid max-w-[1600px] gap-16 px-5 py-24 md:px-10 md:py-32 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <p className="fade label text-moss">Plan your stay</p>
          <h2 id="enquire-title" className="mt-7 text-[clamp(3rem,6.4vw,6.2rem)]">
            <Words text="Wish you were *here.*" />
          </h2>
          <p className="fade mt-8 max-w-sm text-moss" style={{ "--i": 1 } as React.CSSProperties}>
            Tell us when you would like to come and how many of you there are. The form opens WhatsApp with your
            details filled in, and our team replies with availability.
          </p>
          <ContactList className="fade mt-12 border-t border-ink/15 pt-8" style={{ "--i": 2 } as React.CSSProperties} />
        </div>

        {/* The card: a stamp and a postmark in the corner, the message below. */}
        <div
          className="fade relative bg-mist p-6 shadow-[0_1px_0_rgb(28_43_47/0.06),0_30px_60px_-30px_rgb(28_43_47/0.35)] sm:p-10 lg:col-span-7 lg:col-start-6"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <div className="mb-10 flex items-start justify-between gap-6 border-b border-ink/12 pb-8">
            <div>
              <p className="display text-[1.5rem] leading-tight">Prathamesh Valley Resorts</p>
              <address className="mt-2 text-[0.9rem] not-italic leading-relaxed text-moss">
                {contact.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </div>
            <div className="flex shrink-0 items-start gap-1">
              <Postmark id="enquiry" ring="BHILAR · MAHABALESHWAR · 412805 · " center="HELLO" className="hidden w-[150px] -rotate-6 text-ink/30 sm:block" />
              <Stamp className="w-[84px] sm:w-[96px]" />
            </div>
          </div>
          <EnquiryForm defaultPurpose={defaultPurpose} />
        </div>
      </InView>
    </section>
  );
}

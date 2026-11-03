import { ContactList } from "./contact-list";
import { EnquiryForm, type Purpose } from "./enquiry-form";
import { InView, Lines } from "./in-view";

/**
 * The enquiry section at the foot of every page. With scripts on, links to
 * #enquire open the same form in the booking drawer instead (booking-drawer.tsx).
 */
export function Enquiry({ defaultPurpose = "stay" }: { defaultPurpose?: Purpose }) {
  return (
    <section id="enquire" aria-labelledby="enquire-title" className="scroll-mt-0 bg-stone">
      <InView className="mx-auto grid max-w-[1560px] gap-14 px-5 py-24 md:px-10 md:py-36 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <p className="clear kicker text-slate">Plan your stay</p>
          <h2 id="enquire-title" className="mt-7 text-[clamp(2.8rem,5.6vw,5.6rem)]">
            <Lines lines={["Tell us when", <>you would like <em>to come</em></>]} start={1} />
          </h2>
          <p className="clear mt-8 max-w-md text-slate" style={{ "--i": 3 } as React.CSSProperties}>
            The form opens WhatsApp with your details filled in. Send it, and the team replies with availability and
            rates.
          </p>
          <ContactList className="clear mt-12 border-t border-ink/15 pt-8" style={{ "--i": 4 } as React.CSSProperties} />
        </div>

        <EnquiryForm
          defaultPurpose={defaultPurpose}
          className="clear lg:col-span-6 lg:col-start-7 lg:pt-3"
          style={{ "--i": 2 } as React.CSSProperties}
        />
      </InView>
    </section>
  );
}

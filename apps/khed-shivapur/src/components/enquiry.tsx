import { ContactList } from "./contact-list";
import { EnquiryForm, type Purpose } from "./enquiry-form";
import { InView, RiseLines } from "./in-view";

/**
 * The enquiry section at the foot of every page. With scripts on, links to
 * #enquire open the same form in the booking drawer instead (booking-drawer.tsx).
 */
export function Enquiry({ defaultPurpose = "stay" }: { defaultPurpose?: Purpose }) {
  return (
    <section id="enquire" aria-labelledby="enquire-title" className="scroll-mt-0 bg-linen text-forest">
      <InView className="mx-auto grid max-w-[1680px] gap-16 px-5 py-24 md:px-10 md:py-36 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <p className="fade label text-fern">09 · Plan your stay</p>
          <h2 id="enquire-title" className="mt-8 text-[clamp(3.2rem,7vw,7rem)]">
            <RiseLines lines={["Plan your", "stay"]} />
          </h2>
          <p className="fade mt-8 max-w-md text-fern">
            Tell us when you would like to come and how many of you there are. The form opens WhatsApp with your
            details filled in, and our reservations team replies with availability.
          </p>
          <ContactList className="fade mt-12 border-t border-forest/15 pt-8" style={{ "--i": 2 } as React.CSSProperties} />
        </div>

        <EnquiryForm
          defaultPurpose={defaultPurpose}
          className="fade lg:col-span-6 lg:col-start-7"
          style={{ "--i": 1 } as React.CSSProperties}
        />
      </InView>
    </section>
  );
}

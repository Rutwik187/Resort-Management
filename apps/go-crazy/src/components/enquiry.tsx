import { ContactList } from "./contact-list";
import { EnquiryForm, type Purpose } from "./enquiry-form";
import { InView, SnapLines } from "./in-view";

const titles: Record<Purpose, string[]> = {
  day: ["Plan your", "day out"],
  stay: ["Plan your", "stay"],
  school: ["Plan the", "school trip"],
  wedding: ["Plan the", "celebration"],
  event: ["Plan the", "celebration"],
};

/**
 * The enquiry section at the foot of every page. With scripts on, links to
 * #enquire open the same form in the booking drawer instead (booking-drawer.tsx).
 */
export function Enquiry({ defaultPurpose = "day" }: { defaultPurpose?: Purpose }) {
  return (
    <section id="enquire" aria-labelledby="enquire-title" className="scroll-mt-16 border-t-2 border-ink bg-bone">
      <InView className="mx-auto grid max-w-[1600px] gap-14 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <p className="up label marker marker-brick text-ink">Enquire</p>
          <h2 id="enquire-title" className="mt-7 text-[clamp(3.6rem,9vw,8rem)]">
            <SnapLines lines={titles[defaultPurpose]} />
          </h2>
          <p className="up mt-7 max-w-md text-stone" style={{ "--i": 1 } as React.CSSProperties}>
            Tell us the date and how many of you are coming. The form opens WhatsApp with your details filled in, and
            our team replies with availability.
          </p>
          <ContactList className="up mt-10 border-t-2 border-ink pt-8" style={{ "--i": 2 } as React.CSSProperties} />
        </div>

        <div className="up lg:col-span-6 lg:col-start-7" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="rounded-[6px] bg-chalk p-6 shadow-[0_0_0_2px_var(--color-ink)] md:p-9">
            <EnquiryForm defaultPurpose={defaultPurpose} />
          </div>
        </div>
      </InView>
    </section>
  );
}

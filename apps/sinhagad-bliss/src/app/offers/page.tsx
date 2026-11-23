import { OffersList } from "@repo/website/offers";
import { contact } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Offers",
  description: "The Offer of the Day and every live offer at Sinhagad Bliss, with its terms and dates.",
  path: "/offers",
});

/** The Offer of the Day and every live offer, with terms and validity (OFR-01, OFR-02). The admin manages them. */
export default function OffersPage() {
  return (
    <PageTransition>
      <header className="mx-auto max-w-[1560px] px-5 pb-12 pt-36 md:px-10 md:pt-48">
        <p className="kicker text-slate">Offers</p>
        <h1 className="mt-8 text-[clamp(3.2rem,8vw,8rem)] leading-[0.98]">
            <em>Offers</em>
          </h1>
        <p className="mt-6 max-w-xl text-slate">
          Offers apply by themselves when you book online, one per booking. Have a coupon? Enter it with your details before you pay.
        </p>
      </header>
      <div className="mx-auto max-w-[1560px] px-5 pb-24 md:px-10">
        <OffersList code="SB" empty={<>No offers just now. Call or WhatsApp {contact.whatsapp.display} to ask about group and long-stay rates.</>} />
      </div>
    </PageTransition>
  );
}

import { OffersList } from "@repo/website/offers";
import { contact } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";
import { SectionLabel } from "@/components/section-label";

export const metadata = pageMetadata({
  title: "Offers",
  description: "The Offer of the Day and every live offer at Prathamesh Valley Resorts, Mahabaleshwar, with its terms and dates.",
  path: "/offers",
});

/** The Offer of the Day and every live offer, with terms and validity (OFR-01, OFR-02). The admin manages them. */
export default function OffersPage() {
  return (
    <PageTransition>
      <header className="mx-auto max-w-[1600px] px-5 pb-12 pt-32 md:px-10 md:pt-44">
        <SectionLabel className="text-moss">Offers</SectionLabel>
        <h1 className="mt-8 max-w-4xl text-[clamp(3rem,7vw,7rem)]">
            Offers and <em>deals</em>
          </h1>
        <p className="mt-6 max-w-xl text-moss">
          Offers apply by themselves when you book online, one per booking. Have a coupon? Enter it with your details before you pay.
        </p>
      </header>
      <div className="mx-auto max-w-[1600px] px-5 pb-24 md:px-10">
        <OffersList code="PV" empty={<>No offers just now. Call or WhatsApp {contact.whatsapp.display} to ask about group and long-stay rates.</>} />
      </div>
    </PageTransition>
  );
}

import { OffersList } from "@repo/website/offers";
import { contact } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Offers",
  description: "The Offer of the Day and every live offer at Prathamesh Go Crazy, Sinhagad, with its terms and dates.",
  path: "/offers",
});

/** The Offer of the Day and every live offer, with terms and validity (OFR-01, OFR-02). The admin manages them. */
export default function OffersPage() {
  return (
    <PageTransition>
      <header className="mx-auto max-w-[1600px] px-4 pb-12 pt-28 md:px-8 md:pt-36">
        <p className="up label marker marker-lime">Offers</p>
        <h1 className="mt-6 text-[clamp(3.4rem,9vw,8rem)]">Offers and deals</h1>
        <p className="mt-6 max-w-xl text-stone">
          Offers apply by themselves when you book online, one per booking. Have a coupon? Enter it with your details before you pay.
        </p>
      </header>
      <div className="mx-auto max-w-[1600px] px-4 pb-24 md:px-8">
        <OffersList code="GC" empty={<>No offers just now. Call or WhatsApp {contact.whatsapp.display} to ask about group and long-stay rates.</>} />
      </div>
    </PageTransition>
  );
}

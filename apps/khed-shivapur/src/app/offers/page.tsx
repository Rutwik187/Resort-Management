import { OffersList } from "@repo/website/offers";
import { contact } from "@/content/resort";
import { pageMetadata } from "@/content/site";
import { PageTransition } from "@/components/page-transition";

export const metadata = pageMetadata({
  title: "Offers",
  description: "The Offer of the Day and every live offer at Prathamesh Resorts, Khed Shivapur, with its terms and dates.",
  path: "/offers",
});

/** The Offer of the Day and every live offer, with terms and validity (OFR-01, OFR-02). The admin manages them. */
export default function OffersPage() {
  return (
    <PageTransition>
      <header className="mx-auto max-w-[1680px] px-5 pb-12 pt-28 md:px-10 md:pt-36">
        <p className="label text-fern">Offers</p>
        <h1 className="mt-6 max-w-4xl text-[clamp(2.8rem,5.4vw,5.4rem)]">
            Offers and <em>deals</em>
          </h1>
        <p className="mt-6 max-w-xl text-fern">
          Offers apply by themselves when you book online, one per booking. Have a coupon? Enter it with your details before you pay.
        </p>
      </header>
      <div className="mx-auto max-w-[1680px] px-5 pb-24 md:px-10">
        <OffersList code="KS" empty={<>No offers just now. Call or WhatsApp {contact.whatsapp.display} to ask about group and long-stay rates.</>} />
      </div>
    </PageTransition>
  );
}

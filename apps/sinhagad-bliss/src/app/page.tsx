import type { Viewport } from "next";
import { Hero } from "@/components/home/hero";
import { Intro } from "@/components/home/intro";
import { Rooms } from "@/components/home/rooms";
import { Villas } from "@/components/home/villas";
import { Mornings } from "@/components/home/mornings";
import { Evenings } from "@/components/home/evenings";
import { Celebrations } from "@/components/home/celebrations";
import { WayUp } from "@/components/home/way-up";
import { Offers } from "@/components/offers";
import { Enquiry } from "@/components/enquiry";
import { PageTransition } from "@/components/page-transition";
import { contact } from "@/content/resort";
import { pageMetadata, siteName, siteUrl } from "@/content/site";

const description =
  "A mountain view resort in the foothills of Sinhagad, near Khadakwasla, Pune. Rooms that face the hills, villas with private pools, veg and non-veg kitchens kept apart, and a lawn for weddings.";

export const metadata = pageMetadata({ description, path: "/" });

// The page opens under a shaded header, so the phone's browser bar matches it.
export const viewport: Viewport = {
  themeColor: "#18212d",
};

// No coordinates: none could be checked against the resort's own photos yet.
const resortJsonLd = {
  "@context": "https://schema.org",
  "@type": "Resort",
  name: siteName,
  description,
  url: siteUrl,
  image: `${siteUrl}/og-image.jpg`,
  telephone: "+91-99702-45656",
  email: contact.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Gat No. 121, near Swaraj Hotel Haveli, At Post Donje, Ghera Sinhagad",
    addressLocality: "Pune",
    addressRegion: "Maharashtra",
    postalCode: "411025",
    addressCountry: "IN",
  },
  checkinTime: "13:00",
  checkoutTime: "10:00",
  hasMap: contact.mapsUrl,
  sameAs: contact.social.map((s) => s.href),
};

export default function HomePage() {
  return (
    <PageTransition>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(resortJsonLd) }} />
      <Hero />
      <Intro />
      <Rooms />
      <Villas />
      <Mornings />
      <Evenings />
      <Celebrations />
      <WayUp />
      <Offers />
      <Enquiry />
    </PageTransition>
  );
}

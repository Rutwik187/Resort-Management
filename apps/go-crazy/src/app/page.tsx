import type { Viewport } from "next";
import { Enquiry } from "@/components/enquiry";
import { Board } from "@/components/home/board";
import { CelebrationsTeaser } from "@/components/home/celebrations";
import { Hero } from "@/components/home/hero";
import { Intro } from "@/components/home/intro";
import { Near } from "@/components/home/near";
import { Passes } from "@/components/home/passes";
import { SchoolsTeaser } from "@/components/home/schools";
import { StaysTeaser } from "@/components/home/stays";
import { PageTransition } from "@/components/page-transition";
import { contact, dayPasses, formatRupees, stays } from "@/content/resort";
import { legalName, pageMetadata, siteUrl } from "@/content/site";

export const metadata = pageMetadata({
  description:
    "An adventure park and resort at the foot of Sinhagad fort, Pune. Zip line, high ropes, a climbing tower, a pool with slides and more than 70 activities, with day passes from ₹1,200 including meals.",
  path: "/",
});

// The page opens on a dark film, so the phone's browser bar matches it.
export const viewport: Viewport = {
  themeColor: "#0e1a14",
};

const prices = [...dayPasses.map((p) => p.adult), ...stays.map((s) => s.perPerson ?? s.weekday?.base ?? 0)].filter(Boolean);

const parkJsonLd = {
  "@context": "https://schema.org",
  "@type": ["AmusementPark", "Resort"],
  name: legalName,
  alternateName: "Go Crazy Adventure Park",
  url: siteUrl,
  image: `${siteUrl}/og-image.jpg`,
  telephone: "+91-90494-32222",
  email: contact.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: "At Post Donje, Polekar Wadi, Ghera Sinhagad Fort",
    addressLocality: "Pune",
    addressRegion: "Maharashtra",
    postalCode: "411025",
    addressCountry: "IN",
  },
  hasMap: contact.mapsUrl,
  priceRange: `${formatRupees(Math.min(...prices))} to ${formatRupees(Math.max(...prices))}`,
  checkinTime: "13:00",
  checkoutTime: "10:00",
  amenityFeature: ["Swimming pool", "Water slides", "Zip line", "High ropes course", "Climbing wall", "Children's play area", "Banquet hall", "Parking"].map(
    (name) => ({ "@type": "LocationFeatureSpecification", name, value: true }),
  ),
};

export default function HomePage() {
  return (
    <PageTransition>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(parkJsonLd) }} />
      <Hero />
      <Intro />
      <Passes />
      <Board />
      <StaysTeaser />
      <SchoolsTeaser />
      <CelebrationsTeaser />
      <Near />
      <Enquiry />
    </PageTransition>
  );
}

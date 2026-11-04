import type { Viewport } from "next";
import { Hero } from "@/components/home/hero";
import { Intro } from "@/components/home/intro";
import { StaysRail } from "@/components/home/stays-rail";
import { GlassHouse } from "@/components/home/glass-house";
import { ExperienceIndex } from "@/components/home/experience-index";
import { DayEscapes } from "@/components/home/day-escapes";
import { Celebrations } from "@/components/home/celebrations";
import { Kitchens } from "@/components/home/kitchens";
import { Place } from "@/components/home/place";
import { BookBar } from "@/components/home/book-bar";
import { OurResorts } from "@/components/home/our-resorts";
import { Enquiry } from "@/components/enquiry";
import { PageTransition } from "@/components/page-transition";
import { contact } from "@/content/resort";
import { pageMetadata, siteName, siteUrl } from "@/content/site";

export const metadata = pageMetadata({
  description:
    "A green valley resort at the foot of the Sahyadri, near Khed Shivapur, Pune. Riverside glass houses on stilts, a private-pool villa, river view tents and laterite stone cottages, with more than 80 activities and day packages.",
  path: "/",
});

// The page opens on a dark film, so the phone's browser bar matches it.
export const viewport: Viewport = {
  themeColor: "#0b1813",
};

const resortJsonLd = {
  "@context": "https://schema.org",
  "@type": "Resort",
  name: siteName,
  url: siteUrl,
  image: `${siteUrl}/resort-photo.jpg`,
  telephone: "+91-90495-38888",
  email: contact.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: "At Post Salawade, near Khed Shivapur Toll, Taluka Bhor",
    addressLocality: "Pune",
    addressRegion: "Maharashtra",
    postalCode: "412205",
    addressCountry: "IN",
  },
  geo: { "@type": "GeoCoordinates", latitude: contact.geo.lat, longitude: contact.geo.lng },
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
      <BookBar />
      <Intro />
      <StaysRail />
      <GlassHouse />
      <ExperienceIndex />
      <DayEscapes />
      <Celebrations />
      <Kitchens />
      <Place />
      <OurResorts />
      <Enquiry />
    </PageTransition>
  );
}

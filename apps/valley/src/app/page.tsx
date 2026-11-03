import { Hero } from "@/components/home/hero";
import { Welcome } from "@/components/home/welcome";
import { Cottages } from "@/components/home/cottages";
import { Packages } from "@/components/home/packages";
import { Seasons } from "@/components/home/seasons";
import { Table } from "@/components/home/table";
import { Grounds } from "@/components/home/grounds";
import { Celebrations } from "@/components/home/celebrations";
import { Explore } from "@/components/home/explore";
import { FindUs } from "@/components/home/find-us";
import { Enquiry } from "@/components/enquiry";
import { PageTransition } from "@/components/page-transition";
import { contact } from "@/content/resort";
import { pageMetadata, siteName, siteUrl } from "@/content/site";

export const metadata = pageMetadata({
  description:
    "Red laterite cottages at Bhilar, between Panchgani and Mahabaleshwar, in the Western Ghats. AC cottages with a jacuzzi or a bath tub, couple, group and full-board packages, two kitchens, weddings and an in-house guide for sightseeing.",
  path: "/",
});

const resortJsonLd = {
  "@context": "https://schema.org",
  "@type": "Resort",
  name: siteName,
  url: siteUrl,
  image: `${siteUrl}/resort-photo.jpg`,
  telephone: "+91-92251-05656",
  email: contact.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: "SR. No. 28/1 & 48/2, Bhilar Kaswand Road, Bhilar",
    addressLocality: "Mahabaleshwar",
    addressRegion: "Maharashtra",
    postalCode: "412805",
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
      <Welcome />
      <Cottages />
      <Packages />
      <Seasons />
      <Table />
      <Grounds />
      <Celebrations />
      <Explore />
      <FindUs />
      <Enquiry />
    </PageTransition>
  );
}

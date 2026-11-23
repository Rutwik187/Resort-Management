import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { SiteConsent } from "@repo/booking-ui/consent";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { defaultTitle, siteName, siteUrl } from "@/content/site";
import "./globals.css";

// Body: Inter, which has the rupee sign. Headings: Instrument Serif, a calm editorial serif.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultTitle, template: `%s | ${siteName}` },
  description: "Four resorts of the Prathamesh Group near Pune and in Mahabaleshwar. Search them together, then book on the resort's own site.",
  applicationName: siteName,
};

export const viewport: Viewport = { themeColor: "#f3f0ea" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${serif.variable}`}>
      <body>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <SiteConsent gtmId={process.env.NEXT_PUBLIC_GTM_ID} metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} policyHref="/policies" />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Jost, Spectral } from "next/font/google";
import localFont from "next/font/local";
import { SiteNotices } from "@repo/website/notice";
import { BookingDrawer } from "@/components/booking-drawer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { defaultTitle, siteName, siteUrl } from "@/content/site";
import "./globals.css";

// Headings and text: Jost, a geometric sans in the spirit of the logo's capitals.
// Light and large for headings, regular for reading.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

// One accent word in a heading, in a light classical italic.
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: "300",
  style: "italic",
  display: "swap",
});

// Jost has no rupee sign. These files hold only ₹, from Poppins, a geometric
// sans that sits well beside Jost's figures (see fonts/OFL-poppins.txt).
const rupee = localFont({
  src: [
    { path: "./fonts/rupee-300.woff2", weight: "300" },
    { path: "./fonts/rupee-400.woff2", weight: "400" },
  ],
  variable: "--font-rupee",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+20B9" },
    { prop: "size-adjust", value: "96%" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultTitle, template: `%s | ${siteName}` },
  description:
    "A mountain view resort in the foothills of Sinhagad, near Khadakwasla, Pune. Cottages and villas with private pools, rooms that face the hills, and veg and non-veg kitchens kept apart.",
  applicationName: siteName,
};

export const viewport: Viewport = {
  themeColor: "#f1f0ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${jost.variable} ${spectral.variable} ${rupee.variable}`} suppressHydrationWarning>
      <head>
        {/* Lets CSS hide reveal targets only when scripts can reveal them again. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <SmoothScroll />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <SiteNotices code="SB" />
        <BookingDrawer />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { SiteNotices } from "@repo/website/notice";
import { BookingDrawer } from "@/components/booking-drawer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { defaultTitle, siteName, siteUrl } from "@/content/site";
import "./globals.css";

// Headings: Fraunces, a soft "old style" serif. Its optical-size axis makes
// large headings fine and high in contrast and small ones sturdier, and its
// soft axis rounds the corners a little: warm, like the laterite and the
// hills. Latin Extended carries the rupee sign. One variable file covers
// every weight the site uses.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  style: "normal",
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

// Its italic, for the warm word in a heading. Never above the fold on the
// home page, so it is not preloaded and does not compete with the film.
const frauncesItalic = Fraunces({
  variable: "--font-fraunces-italic",
  subsets: ["latin", "latin-ext"],
  style: "italic",
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
  preload: false,
});

// Text: Manrope, a clear modern grotesque with an open, friendly shape and a rupee sign of its own.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultTitle, template: `%s | ${siteName}` },
  description:
    "Red laterite cottages at Bhilar, between Panchgani and Mahabaleshwar, in the Western Ghats. AC cottages with a jacuzzi or a bath tub, couple, group and full-board packages, weddings and events.",
  applicationName: siteName,
};

export const viewport: Viewport = {
  themeColor: "#eef0ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${frauncesItalic.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        {/* Lets CSS hide reveal targets only when scripts can reveal them again. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <SmoothScroll />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <SiteNotices code="PV" />
        <BookingDrawer />
      </body>
    </html>
  );
}

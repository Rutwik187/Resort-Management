import type { Metadata, Viewport } from "next";
import { Besley, Schibsted_Grotesk } from "next/font/google";
import { BookingDrawer } from "@/components/booking-drawer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { defaultTitle, siteName, siteUrl } from "@/content/site";
import "./globals.css";

// Headings: Besley, a revival of the 1845 Clarendon, the face of old
// hotel signboards and travel posters, drawn again for the screen. One
// variable file covers every weight the site uses.
const besley = Besley({
  variable: "--font-besley",
  subsets: ["latin"],
  style: "normal",
  display: "swap",
});

// Its italic, for the warm word in a heading. Never above the fold on the
// home page, so it is not preloaded and does not compete with the film.
const besleyItalic = Besley({
  variable: "--font-besley-italic",
  subsets: ["latin"],
  style: "italic",
  display: "swap",
  preload: false,
});

// Text: a crisp grotesque with a rupee sign of its own.
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
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
    <html lang="en-IN" className={`${besley.variable} ${besleyItalic.variable} ${schibsted.variable}`} suppressHydrationWarning>
      <head>
        {/* Lets CSS hide reveal targets only when scripts can reveal them again. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <SmoothScroll />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <BookingDrawer />
      </body>
    </html>
  );
}

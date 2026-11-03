import type { Metadata, Viewport } from "next";
import { Albert_Sans } from "next/font/google";
import localFont from "next/font/local";
import { BookingDrawer } from "@/components/booking-drawer";
import { Cursor } from "@/components/cursor";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { defaultTitle, siteName, siteUrl } from "@/content/site";
import "./globals.css";

// Headings: Newsreader, an editorial serif whose optical sizes turn finer and
// sharper as it grows. Trimmed to the one weight and the characters this site
// uses, including ₹ and the marks in coordinates (see fonts/README.md).
const newsreader = localFont({
  src: "./fonts/newsreader-light.woff2",
  variable: "--font-newsreader",
  weight: "300",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

// Its true italic, for the one word in a heading that matters. Never above
// the fold, so it is not preloaded and does not compete with the opening film.
const newsreaderItalic = localFont({
  src: "./fonts/newsreader-light-italic.woff2",
  variable: "--font-newsreader-italic",
  weight: "300",
  style: "italic",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
});

// One Marathi word, सह्याद्री, in a Devanagari typeface drawn for Marathi.
// The file holds only that word's letters (see fonts/README.md).
const tiroMarathi = localFont({
  src: "./fonts/tiro-devanagari-marathi-sahyadri.woff2",
  variable: "--font-tiro-marathi",
  weight: "400",
  display: "swap",
  preload: false,
});

// Body: a quiet grotesque with open shapes and a rupee sign of its own.
const albert = Albert_Sans({
  variable: "--font-albert",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultTitle, template: `%s | ${siteName}` },
  description:
    "A green valley resort at the foot of the Sahyadri, near Khed Shivapur, Pune. Riverside glass houses on stilts, a private-pool villa, tents and laterite stone cottages, with more than 80 activities.",
  applicationName: siteName,
};

export const viewport: Viewport = {
  themeColor: "#f2efe7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${newsreader.variable} ${newsreaderItalic.variable} ${tiroMarathi.variable} ${albert.variable}`} suppressHydrationWarning>
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
        <Cursor />
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}

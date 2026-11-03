import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { BookingDrawer } from "@/components/booking-drawer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { defaultTitle, legalName, siteName, siteUrl } from "@/content/site";
import "./globals.css";

// One family for everything: Archivo, a sturdy grotesque. Its width axis runs
// from the condensed display capitals (62%) to normal text (100%), so headlines
// can pull tight as they arrive. Trimmed to what this site uses (see fonts/README.md).
const archivo = localFont({
  src: "./fonts/archivo-variable.woff2",
  variable: "--font-archivo",
  weight: "400 900",
  style: "normal",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 100%" }],
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultTitle, template: `%s | ${siteName}` },
  description:
    "An adventure park and resort at the foot of Sinhagad fort, Pune. More than 70 activities, morning, afternoon, evening and full-day passes with meals, school trips, weddings and cottages for the night.",
  applicationName: legalName,
};

export const viewport: Viewport = {
  themeColor: "#f6f5ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={archivo.variable} suppressHydrationWarning>
      <head>
        {/* Lets CSS hide reveal targets only when scripts can reveal them again. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <BookingDrawer />
      </body>
    </html>
  );
}

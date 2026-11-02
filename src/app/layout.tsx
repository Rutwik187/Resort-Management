import type { Metadata, Viewport } from "next";
import { Figtree, Gilda_Display } from "next/font/google";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { defaultTitle, siteName, siteUrl } from "@/content/site";
import "./globals.css";

// Headings: a high-contrast luxury serif (Didone style) with sturdy thin
// strokes, so it stays readable from card titles up to the hero.
const gilda = Gilda_Display({
  variable: "--font-gilda",
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Body: open letterforms and a tall x-height for comfortable reading.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultTitle, template: `%s | ${siteName}` },
  description:
    "A green valley resort at the foot of the Sahyadri, near Khed Shivapur, Pune. Glass houses, a private-pool villa, tents and stone cottages, with more than 80 activities.",
  applicationName: siteName,
};

export const viewport: Viewport = {
  themeColor: "#e9ece4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${gilda.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        {/* Lets CSS hide reveal targets only when scripts can reveal them again. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <SmoothScroll />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

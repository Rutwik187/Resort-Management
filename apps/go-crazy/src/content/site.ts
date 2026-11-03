import type { Metadata } from "next";

export const siteUrl = "https://gocrazyadventure.com";
export const siteName = "Prathamesh Go Crazy";
export const legalName = "Prathamesh Go Crazy Adventure Park & Resort";
export const defaultTitle = "Prathamesh Go Crazy | Adventure park and resort at Sinhagad, Pune";

const shareImage = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Water slides, a zip line and the climbing tower at Prathamesh Go Crazy, with the words Go Crazy.",
};

/**
 * One place for page metadata, so title, description, canonical URL and
 * the Open Graph and Twitter tags always agree with each other.
 */
export function pageMetadata({ title, description, path }: { title?: string; description: string; path: string }): Metadata {
  const fullTitle = title ? `${title} | ${siteName}` : defaultTitle;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName,
      locale: "en_IN",
      url: path,
      title: fullTitle,
      description,
      images: [shareImage],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [shareImage] },
  };
}

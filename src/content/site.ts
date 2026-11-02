import type { Metadata } from "next";

export const siteUrl = "https://prathameshresorts.com";
export const siteName = "Prathamesh Resorts";
export const defaultTitle = "Prathamesh Resorts | A green valley retreat near Pune";

const shareImage = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "The arched window from the Prathamesh Resorts home page, framing the pool, with the words Come, breathe.",
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

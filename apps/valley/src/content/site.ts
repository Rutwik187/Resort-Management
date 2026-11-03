import type { Metadata } from "next";

export const siteUrl = "https://prathameshvalleyresorts.com";
export const siteName = "Prathamesh Valley Resorts";
export const defaultTitle = "Prathamesh Valley Resorts | A hill-station holiday at Bhilar, Mahabaleshwar";

const shareImage = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Greetings from Bhilar: the word Bhilar in large letters, filled with a drone view of the resort's cottages among green fields.",
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

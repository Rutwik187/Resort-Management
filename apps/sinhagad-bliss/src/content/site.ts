import type { Metadata } from "next";

export const siteUrl = "https://sinhagadbliss.com";
export const siteName = "Sinhagad Bliss";
export const defaultTitle = "Sinhagad Bliss | A mountain view resort near Sinhagad, Pune";

const shareImage = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "A cottage at Sinhagad Bliss with the hills of Sinhagad behind it, and the words A mountain view resort.",
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

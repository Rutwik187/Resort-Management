import type { Metadata } from "next";

/*
 * The Prathamesh Group's own site (URD 4.1): the four resorts together,
 * search across them, and the group's weddings and corporate enquiries.
 * Its domain is still to be chosen by the client; GROUP_SITE_URL sets it.
 */

export const siteUrl = (process.env.GROUP_SITE_URL ?? "https://prathamesh-group.vercel.app").replace(/\/$/, "");
export const siteName = "Prathamesh Group";
export const defaultTitle = "Prathamesh Group | Four resorts near Pune and in Mahabaleshwar";

export function pageMetadata({ title, description, path }: { title?: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}${path}` },
    openGraph: { title: title ? `${title} | ${siteName}` : defaultTitle, description, url: `${siteUrl}${path}`, siteName, locale: "en_IN", type: "website" },
  };
}

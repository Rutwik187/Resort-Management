import "server-only";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { getDb, properties } from "@repo/db";

/*
 * Each resort website keeps its rooms, rates and packages cached until the
 * admin says they changed (docs/implementation-plan.md, section 10). Two
 * settings connect them: WEBSITE_URLS, such as
 * "KS=https://prathameshresorts.vercel.app,GC=https://gocrazyadventure.vercel.app",
 * and REVALIDATE_SECRET, which the websites share.
 */

/** Each resort's website address, from WEBSITE_URLS. */
export function websiteUrls(): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const pair of (process.env.WEBSITE_URLS ?? "").split(",")) {
    const [code, url] = pair.split("=").map((part) => part?.trim());
    if (code && url) urls[code.toUpperCase()] = url.replace(/\/+$/, "");
  }
  return urls;
}

/**
 * Asks one website to load its catalogue again, or with "content" its
 * Sanity blog, FAQs and policies. Says whether it answered.
 */
export async function refreshWebsite(code: string, scope: "catalogue" | "content" = "catalogue"): Promise<{ ok: boolean; reason?: string }> {
  const url = websiteUrls()[code.toUpperCase()];
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return { ok: false, reason: "The website isn't connected to the admin yet." };
  try {
    const response = await fetch(`${url}/api/revalidate${scope === "content" ? "?scope=content" : ""}`, { method: "POST", headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(8000) });
    return response.ok ? { ok: true } : { ok: false, reason: `The website answered ${response.status}.` };
  } catch {
    return { ok: false, reason: "The website didn't answer." };
  }
}

/**
 * Called after staff change a resort's rooms, rates or packages. The
 * website refreshes after the response is sent, so the form doesn't wait.
 */
export function websiteChanged(propertyId: string) {
  after(async () => {
    const [property] = await getDb().select({ code: properties.code }).from(properties).where(eq(properties.id, propertyId));
    if (!property) return;
    const result = await refreshWebsite(property.code);
    if (!result.ok && websiteUrls()[property.code]) console.error(`The ${property.code} website didn't refresh: ${result.reason}`);
  });
}

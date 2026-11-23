"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, properties, redirects, reviews } from "@repo/db";
import { NotFoundError, syncGoogleReviews } from "@repo/engine";
import { filled, problem, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";
import { websiteChanged } from "@/lib/website";

const forbidden = "Your role can't change the website.";

/** Saves the resort's Google Maps place id and reads its reviews at once (REV-01). */
export async function savePlaceId(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("website.manage", propertyId);
    const { placeId } = z.object({ placeId: z.string().trim().regex(/^[\w-]{10,300}$/, "A place id looks like ChIJ… with letters, numbers, dashes and underscores.").optional() }).parse(filled(form));
    const db = getDb();
    await db.update(properties).set({ googlePlaceId: placeId ?? null }).where(eq(properties.id, propertyId));
    await audit({ userId: staff.userId, propertyId, action: "reviews.place", entity: "properties", entityId: propertyId, after: { googlePlaceId: placeId ?? null } });
    if (!placeId) {
      refresh();
      return { done: "Place id cleared." };
    }
    const [result] = await syncGoogleReviews(db, { propertyId });
    websiteChanged(propertyId);
    refresh();
    return result?.error ? { error: `Saved, but Google said: ${result.error}` } : { done: `Saved, and ${result?.saved ?? 0} reviews read from Google.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Reads the reviews from Google again now. */
export async function syncReviewsNow(propertyId: string): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    await requirePermission("website.manage", propertyId);
    const [result] = await syncGoogleReviews(getDb(), { propertyId });
    websiteChanged(propertyId);
    refresh();
    if (!result) return { error: "Add the resort's Google place id first." };
    return result.error ? { error: `Google said: ${result.error}` } : { done: `${result.saved} reviews read from Google.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Features a review on the home page, or hides it from the website (REV-03). */
export async function setReviewFlag(reviewId: string, flag: "featured" | "hidden", on: boolean): Promise<FormState> {
  try {
    z.uuid().parse(reviewId);
    const db = getDb();
    const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
    if (!review) throw new NotFoundError("Review");
    const staff = await requirePermission("website.manage", review.propertyId);
    await db.update(reviews).set(flag === "featured" ? { featured: on, ...(on ? { hidden: false } : {}) } : { hidden: on, ...(on ? { featured: false } : {}) }).where(eq(reviews.id, reviewId));
    await audit({ userId: staff.userId, propertyId: review.propertyId, action: `review.${flag}`, entity: "reviews", entityId: reviewId, before: { [flag]: review[flag] }, after: { [flag]: on } });
    websiteChanged(review.propertyId);
    refresh();
    return { done: flag === "featured" ? (on ? "Featured on the home page." : "No longer featured.") : on ? "Hidden from the website." : "Shown on the website." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Asks Vercel to rebuild the resort's site, so new redirects take effect (DEPLOY_HOOKS). */
async function rebuildSite(code: string) {
  let hooks: Record<string, string> = {};
  try {
    hooks = JSON.parse(process.env.DEPLOY_HOOKS ?? "{}");
  } catch {
    return false;
  }
  const hook = hooks[code];
  if (!hook) return false;
  const response = await fetch(hook, { method: "POST", signal: AbortSignal.timeout(8000) }).catch(() => null);
  return Boolean(response?.ok);
}

const path = z.string().trim().max(300);

/** Adds a redirect from an old address to a new one (SEO-04, SEO-07), then rebuilds the site. */
export async function addRedirect(propertyId: string, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("website.manage", propertyId);
    const input = z
      .object({
        from: path.regex(/^\/[^\s?#]*$/, "The old address starts with / and has no spaces, such as /school-picnic.").refine((v) => v !== "/", "The home page can't move."),
        to: path.regex(/^(\/[^\s]*|https:\/\/[^\s]+)$/, "The new address starts with / or https://."),
      })
      .refine((v) => v.from !== v.to, { error: "The old and new addresses are the same." })
      .parse(filled(form));
    const db = getDb();
    const [property] = await db.select({ code: properties.code }).from(properties).where(eq(properties.id, propertyId));
    const [row] = await db
      .insert(redirects)
      .values({ propertyId, fromPath: input.from.replace(/\/+$/, "") || "/", toPath: input.to, createdBy: staff.userId })
      .onConflictDoUpdate({ target: [redirects.propertyId, redirects.fromPath], set: { toPath: input.to } })
      .returning();
    await audit({ userId: staff.userId, propertyId, action: "redirect.save", entity: "redirects", entityId: row.id, after: row });
    const rebuilt = await rebuildSite(property.code);
    refresh();
    return { done: rebuilt ? "Saved. The site is rebuilding; the redirect works in a few minutes." : "Saved. It takes effect at the site's next deploy (no deploy hook is set for this resort)." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Removes a redirect, then rebuilds the site. */
export async function removeRedirect(redirectId: string): Promise<FormState> {
  try {
    z.uuid().parse(redirectId);
    const db = getDb();
    const [row] = await db.select().from(redirects).where(eq(redirects.id, redirectId));
    if (!row) throw new NotFoundError("Redirect");
    const staff = await requirePermission("website.manage", row.propertyId);
    await db.delete(redirects).where(and(eq(redirects.id, redirectId), eq(redirects.propertyId, row.propertyId)));
    await audit({ userId: staff.userId, propertyId: row.propertyId, action: "redirect.remove", entity: "redirects", entityId: redirectId, before: row });
    const [property] = await db.select({ code: properties.code }).from(properties).where(eq(properties.id, row.propertyId));
    await rebuildSite(property.code);
    refresh();
    return { done: "Redirect removed." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

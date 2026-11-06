import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { passesFromCatalogue, stayGroupsFromCatalogue, type ListingGroup, type Pass } from "@repo/booking-ui/catalogue";
import { getDb } from "@repo/db";
import { websiteCatalogue } from "@repo/engine";
import { propertyByCode, type PropertyCode } from "@repo/sites";

/*
 * What a resort website reads from the admin (docs/implementation-plan.md,
 * section 10): its rooms, rates and day packages. Each read is cached until
 * the admin says the resort's catalogue changed, and refreshed once a day
 * anyway, so browsing doesn't wake the database. A site without a database,
 * or one that can't reach it, shows its own content instead.
 */

/** The cache tag for one resort's catalogue. */
export const catalogueTag = (code: PropertyCode) => `catalogue-${code}`;

async function cachedCatalogue(code: PropertyCode) {
  "use cache";
  cacheTag(catalogueTag(code));
  cacheLife("days");
  return websiteCatalogue(getDb(), code);
}

async function catalogue(code: PropertyCode) {
  if (!process.env.DATABASE_URL) return null;
  try {
    return await cachedCatalogue(code);
  } catch (error) {
    // A failed read isn't cached, so the next visit tries again.
    console.error(`The ${code} catalogue didn't load from the admin; showing the site's own content.`, error);
    return null;
  }
}

/**
 * The Stays page's sections, from the admin. Photos come from the site's
 * own listings with the same code, so a room type keeps its photos when
 * staff change its text or prices.
 */
export async function liveStayGroups(code: PropertyCode, fallback: ListingGroup[]): Promise<ListingGroup[]> {
  const data = await catalogue(code);
  if (!data || data.roomTypes.length === 0) return fallback;
  const photos = new Map(fallback.flatMap((group) => group.listings.map((listing) => [listing.id, listing.photos] as const)));
  return stayGroupsFromCatalogue(data, propertyByCode(code).staySections, (id) => photos.get(id) ?? []);
}

/** The day packages, from the admin, with the site's own photo for each. */
export async function liveDayPasses(code: PropertyCode, fallback: Pass[]): Promise<Pass[]> {
  const data = await catalogue(code);
  const photos = new Map(fallback.map((pass) => [pass.id, pass.photo] as const));
  const passes = data ? passesFromCatalogue(data, (id) => photos.get(id)) : [];
  return passes.length ? passes : fallback;
}

/**
 * The site's POST /api/revalidate. The admin calls it, with the secret both
 * share, after staff change this resort's rooms, rates or packages. The next
 * visit then loads the new catalogue.
 */
export function revalidateRoute(code: PropertyCode) {
  return async function POST(request: Request) {
    const secret = process.env.REVALIDATE_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return Response.json({ error: "Not allowed." }, { status: 401 });
    }
    revalidateTag(catalogueTag(code), { expire: 0 });
    return Response.json({ revalidated: catalogueTag(code) });
  };
}

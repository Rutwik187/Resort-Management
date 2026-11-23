import { and, eq, isNotNull, sql } from "drizzle-orm";
import { properties, reviews, type Database } from "@repo/db";

/*
 * Google reviews (REV-01 to REV-04). The sync reads each resort's Google
 * Maps place through the Places API (the URD's option B: the overall
 * rating, the count and up to five reviews Google picks), stores them, and
 * the sites read the stored copy, so a visit never calls Google. The
 * Business Profile API (option A, every review) needs the client's owner
 * access and Google's approval; it can replace fetchPlace later without
 * changing the rest. Needs GOOGLE_PLACES_API_KEY.
 */

type PlaceReview = {
  name: string;
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  publishTime?: string;
};
type Place = { rating?: number; userRatingCount?: number; googleMapsUri?: string; reviews?: PlaceReview[] };

async function fetchPlace(placeId: string, key: string): Promise<Place> {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews" },
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json().catch(() => ({}))) as Place & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `Google answered ${response.status}.`);
  return data;
}

/** Reads Google's rating, count and reviews for each resort with a place id, or one resort. */
export async function syncGoogleReviews(db: Database, options: { propertyId?: string } = {}) {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return [{ code: "", saved: 0, error: "GOOGLE_PLACES_API_KEY isn't set." }];
  const resorts = await db
    .select({ id: properties.id, code: properties.code, placeId: properties.googlePlaceId })
    .from(properties)
    .where(and(eq(properties.active, true), isNotNull(properties.googlePlaceId), options.propertyId ? eq(properties.id, options.propertyId) : undefined));
  const results: { code: string; saved: number; error?: string }[] = [];
  for (const resort of resorts) {
    try {
      const place = await fetchPlace(resort.placeId!, key);
      let saved = 0;
      for (const review of place.reviews ?? []) {
        if (!review.name || !review.rating) continue;
        const values = {
          author: review.authorAttribution?.displayName ?? "A Google user",
          authorUrl: review.authorAttribution?.uri ?? null,
          photoUrl: review.authorAttribution?.photoUri ?? null,
          rating: Math.round(review.rating),
          text: review.originalText?.text ?? review.text?.text ?? null,
          reviewedAt: review.publishTime ? new Date(review.publishTime) : null,
        };
        await db
          .insert(reviews)
          .values({ propertyId: resort.id, googleId: review.name, ...values })
          .onConflictDoUpdate({ target: [reviews.propertyId, reviews.googleId], set: { ...values, updatedAt: sql`now()` } });
        saved++;
      }
      await db
        .update(properties)
        .set({ googleRating: place.rating === undefined ? null : String(place.rating), googleReviewCount: place.userRatingCount ?? null, reviewsSyncedAt: sql`now()`, ...(place.googleMapsUri ? { mapsUrl: sql`coalesce(${properties.mapsUrl}, ${place.googleMapsUri})` } : {}) })
        .where(eq(properties.id, resort.id));
      results.push({ code: resort.code, saved });
    } catch (error) {
      results.push({ code: resort.code, saved: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

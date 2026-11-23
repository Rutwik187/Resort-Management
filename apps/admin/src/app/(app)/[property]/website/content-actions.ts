"use server";

import { and, eq, max } from "drizzle-orm";
import { refresh } from "next/cache";
import { del, head } from "@vercel/blob";
import { z } from "zod";
import { contentSlots, galleryItems, getDb, properties } from "@repo/db";
import { NotFoundError, RuleError } from "@repo/engine";
import { textSlots } from "@repo/sites";
import { publicToken } from "@/lib/blob";
import { problem, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";
import { websiteChanged } from "@/lib/website";

const forbidden = "Your role can't change the website.";
const slotOf = (key: string) => {
  const slot = textSlots.find((s) => s.key === key);
  if (!slot) throw new NotFoundError("That page text");
  return slot;
};

/** Saves page text as a draft: the website keeps showing the published words (plan section 2). */
export async function saveTextDraft(propertyId: string, key: string, text: string): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const slot = slotOf(key);
    const staff = await requirePermission("website.manage", propertyId);
    const value = z.string().trim().min(3, "Write a little more.").max(slot.max, `Keep it under ${slot.max} letters.`).parse(text);
    await getDb()
      .insert(contentSlots)
      .values({ propertyId, key, draftText: value, createdBy: staff.userId })
      .onConflictDoUpdate({ target: [contentSlots.propertyId, contentSlots.key], set: { draftText: value } });
    refresh();
    return { done: "Draft saved. Publish it to put it on the website." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Puts the draft on the website. */
export async function publishText(propertyId: string, key: string): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    slotOf(key);
    const staff = await requirePermission("website.manage", propertyId);
    const db = getDb();
    const [row] = await db.select().from(contentSlots).where(and(eq(contentSlots.propertyId, propertyId), eq(contentSlots.key, key)));
    if (!row?.draftText) throw new RuleError("Save a draft first.");
    await db.update(contentSlots).set({ publishedText: row.draftText, publishedAt: new Date() }).where(eq(contentSlots.id, row.id));
    await audit({ userId: staff.userId, propertyId, action: "content.publish", entity: "content_slots", entityId: row.id, before: { text: row.publishedText }, after: { text: row.draftText } });
    websiteChanged(propertyId);
    refresh();
    return { done: "Published. The website shows it within a minute." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Goes back to the site's own words. */
export async function resetText(propertyId: string, key: string): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    slotOf(key);
    const staff = await requirePermission("website.manage", propertyId);
    const db = getDb();
    const [row] = await db.select().from(contentSlots).where(and(eq(contentSlots.propertyId, propertyId), eq(contentSlots.key, key)));
    if (!row) return { done: "It already shows the site's own words." };
    await db.delete(contentSlots).where(eq(contentSlots.id, row.id));
    await audit({ userId: staff.userId, propertyId, action: "content.reset", entity: "content_slots", entityId: row.id, before: row });
    websiteChanged(propertyId);
    refresh();
    return { done: "Back to the site's own words." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

const uploaded = z.object({ pathname: z.string().max(400), width: z.number().int().min(1).max(20000).nullable(), height: z.number().int().min(1).max(20000).nullable() });

/**
 * Adds photos the browser has just uploaded to the public store into the
 * gallery under one category (CMS-06). Each gets plain alt text to start,
 * which staff can improve, so it shows on the website at once.
 */
export async function addGalleryPhotos(propertyId: string, category: string, files: unknown): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("website.manage", propertyId);
    const name = z.string().trim().min(2, "Name the category, such as Pool.").max(40).parse(category);
    const list = z.array(uploaded).min(1).max(100).parse(files);
    const token = publicToken();
    if (!token) throw new RuleError("Photo storage isn't set up yet (BLOB_READ_WRITE_TOKEN).");
    const db = getDb();
    const [resort] = await db.select({ name: properties.name }).from(properties).where(eq(properties.id, propertyId));
    const [{ last }] = await db.select({ last: max(galleryItems.sortOrder) }).from(galleryItems).where(and(eq(galleryItems.propertyId, propertyId), eq(galleryItems.category, name)));
    let order = (last ?? 0) + 1;
    for (const file of list) {
      if (!file.pathname.startsWith(`photos/${propertyId}/`)) throw new RuleError("A photo doesn't belong to this resort.");
      const blob = await head(file.pathname, { token });
      await db
        .insert(galleryItems)
        .values({ propertyId, category: name, url: blob.url, pathname: blob.pathname, width: file.width, height: file.height, alt: `${name} at ${resort.name}`, sortOrder: order++, createdBy: staff.userId })
        .onConflictDoNothing();
    }
    await audit({ userId: staff.userId, propertyId, action: "gallery.add", entity: "gallery_items", after: { category: name, photos: list.length } });
    websiteChanged(propertyId);
    refresh();
    return { done: `${list.length} ${list.length === 1 ? "photo" : "photos"} added to ${name}. Improve their alt text below.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

async function photoOf(photoId: string) {
  z.uuid().parse(photoId);
  const [photo] = await getDb().select().from(galleryItems).where(eq(galleryItems.id, photoId));
  if (!photo) throw new NotFoundError("Photo");
  const staff = await requirePermission("website.manage", photo.propertyId);
  return { photo, staff };
}

/** Changes a photo's alt text, caption, category, or whether it is featured or hidden. */
export async function updateGalleryPhoto(photoId: string, values: unknown): Promise<FormState> {
  try {
    const { photo, staff } = await photoOf(photoId);
    const input = z
      .object({
        alt: z.string().trim().min(3, "Describe the photo for people who can't see it (CMS-09).").max(160),
        caption: z.string().trim().max(200).optional(),
        category: z.string().trim().min(2).max(40),
        featured: z.boolean(),
        hidden: z.boolean(),
      })
      .parse(values);
    await getDb().update(galleryItems).set({ ...input, caption: input.caption || null }).where(eq(galleryItems.id, photoId));
    await audit({ userId: staff.userId, propertyId: photo.propertyId, action: "gallery.update", entity: "gallery_items", entityId: photoId, before: photo, after: input });
    websiteChanged(photo.propertyId);
    refresh();
    return { done: "Photo saved." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Moves a photo earlier or later in its category. */
export async function moveGalleryPhoto(photoId: string, direction: "up" | "down"): Promise<FormState> {
  try {
    const { photo } = await photoOf(photoId);
    const db = getDb();
    const list = await db.select({ id: galleryItems.id, sortOrder: galleryItems.sortOrder }).from(galleryItems).where(and(eq(galleryItems.propertyId, photo.propertyId), eq(galleryItems.category, photo.category))).orderBy(galleryItems.sortOrder, galleryItems.createdAt);
    const i = list.findIndex((p) => p.id === photoId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return { done: "It is already at that end." };
    const reordered = [...list];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    await db.transaction(async (tx) => {
      for (const [index, row] of reordered.entries()) await tx.update(galleryItems).set({ sortOrder: index }).where(eq(galleryItems.id, row.id));
    });
    websiteChanged(photo.propertyId);
    refresh();
    return { done: "Moved." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Removes a photo from the gallery and the store. */
export async function deleteGalleryPhoto(photoId: string): Promise<FormState> {
  try {
    const { photo, staff } = await photoOf(photoId);
    const token = publicToken();
    if (token) await del(photo.pathname, { token });
    await getDb().delete(galleryItems).where(eq(galleryItems.id, photoId));
    await audit({ userId: staff.userId, propertyId: photo.propertyId, action: "gallery.delete", entity: "gallery_items", entityId: photoId, before: photo });
    websiteChanged(photo.propertyId);
    refresh();
    return { done: "Photo removed." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, properties, siteNotices } from "@repo/db";
import { NotFoundError, todayInIndia } from "@repo/engine";
import { checkbox, date, filled, problem, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";
import { refreshWebsite, websiteChanged } from "@/lib/website";

const forbidden = "Your role can't change this resort's website.";

/** A page of the website, such as /stays, or a full https address. */
const link = z
  .string()
  .trim()
  .max(300)
  .regex(/^(\/(?!\/)\S*|https?:\/\/\S+)$/, "Write the link as a page of the website, such as /stays, or a full address that starts with https://.");

const noticeInput = z
  .object({
    message: z.string().trim().min(3, "Write the notice.").max(160, "Keep the notice to 160 letters, so it fits on a phone."),
    linkLabel: z.string().trim().max(40, "Keep the link text short, such as See the rooms.").optional(),
    linkUrl: link.optional(),
    startsOn: date("first day").optional(),
    endsOn: date("last day").optional(),
    active: checkbox,
  })
  .refine((v) => Boolean(v.linkLabel) === Boolean(v.linkUrl), { message: "A link needs both its text and where it goes. Fill in both, or neither." })
  .refine((v) => !v.startsOn || !v.endsOn || v.endsOn >= v.startsOn, { message: "The last day can't be before the first." })
  .refine((v) => !v.endsOn || v.endsOn >= todayInIndia(), { message: "The last day has passed, so the notice would never show." });

/** Adds a notice to the resort's website, or changes one (noticeId set). */
export async function saveNotice(propertyId: string, noticeId: string | null, _state: FormState, form: FormData): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("website.manage", propertyId);
    const input = noticeInput.parse(filled(form));
    const db = getDb();
    const values = {
      message: input.message,
      linkLabel: input.linkLabel ?? null,
      linkUrl: input.linkUrl ?? null,
      startsOn: input.startsOn ?? null,
      endsOn: input.endsOn ?? null,
      active: input.active,
    };
    if (noticeId) {
      z.uuid().parse(noticeId);
      const [before] = await db.select().from(siteNotices).where(and(eq(siteNotices.id, noticeId), eq(siteNotices.propertyId, propertyId)));
      if (!before) throw new NotFoundError("That notice no longer exists.");
      const [after] = await db.update(siteNotices).set(values).where(eq(siteNotices.id, noticeId)).returning();
      await audit({ userId: staff.userId, propertyId, action: "notice.update", entity: "site_notices", entityId: noticeId, before, after });
    } else {
      const [created] = await db.insert(siteNotices).values({ propertyId, ...values, createdBy: staff.userId }).returning();
      await audit({ userId: staff.userId, propertyId, action: "notice.create", entity: "site_notices", entityId: created.id, after: created });
    }
    websiteChanged(propertyId);
    refresh();
    return { done: noticeId ? "Notice saved. The website shows it in a moment." : "Notice added. The website shows it in a moment." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Turns a notice on or off at once. */
export async function setNoticeActive(noticeId: string, active: boolean): Promise<FormState> {
  try {
    z.uuid().parse(noticeId);
    const db = getDb();
    const [notice] = await db.select().from(siteNotices).where(eq(siteNotices.id, noticeId));
    if (!notice) throw new NotFoundError("That notice no longer exists.");
    const staff = await requirePermission("website.manage", notice.propertyId);
    await db.update(siteNotices).set({ active: Boolean(active) }).where(eq(siteNotices.id, noticeId));
    await audit({ userId: staff.userId, propertyId: notice.propertyId, action: "notice.active", entity: "site_notices", entityId: noticeId, before: { active: notice.active }, after: { active: Boolean(active) } });
    websiteChanged(notice.propertyId);
    refresh();
    return { done: active ? "The notice is on." : "The notice is off." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Removes a notice from the website and the admin. */
export async function deleteNotice(noticeId: string): Promise<FormState> {
  try {
    z.uuid().parse(noticeId);
    const db = getDb();
    const [notice] = await db.select().from(siteNotices).where(eq(siteNotices.id, noticeId));
    if (!notice) throw new NotFoundError("That notice no longer exists.");
    const staff = await requirePermission("website.manage", notice.propertyId);
    await db.delete(siteNotices).where(eq(siteNotices.id, noticeId));
    await audit({ userId: staff.userId, propertyId: notice.propertyId, action: "notice.delete", entity: "site_notices", entityId: noticeId, before: notice });
    websiteChanged(notice.propertyId);
    refresh();
    return { done: "Notice removed." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Asks the resort's website to load everything it reads from the admin again, now. */
export async function refreshWebsiteNow(propertyId: string): Promise<FormState> {
  try {
    z.uuid().parse(propertyId);
    const staff = await requirePermission("website.manage", propertyId);
    const [property] = await getDb().select({ code: properties.code }).from(properties).where(eq(properties.id, propertyId));
    if (!property) return { error: "That resort no longer exists." };
    const result = await refreshWebsite(property.code);
    if (!result.ok) return { error: result.reason };
    await audit({ userId: staff.userId, propertyId, action: "website.refresh", entity: "properties", entityId: propertyId });
    return { done: "The website now shows the admin's rooms, rates, packages, offers and notices." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

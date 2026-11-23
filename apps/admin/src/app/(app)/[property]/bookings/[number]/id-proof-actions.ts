"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { del, head } from "@vercel/blob";
import { z } from "zod";
import { bookings, getDb, idProofs, properties } from "@repo/db";
import { NotFoundError, RuleError } from "@repo/engine";
import { privateToken } from "@/lib/blob";
import { problem, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";

const forbidden = "Only Front Desk, the Property Manager and the Super Admin handle ID proofs.";

/**
 * Records an ID proof the browser has just uploaded to the private store
 * (ADM-08). The file is checked in the store, and its deletion date set
 * from the resort's retention days.
 */
export async function recordIdProof(bookingId: string, file: { pathname: string; label: string }): Promise<FormState> {
  try {
    z.uuid().parse(bookingId);
    const input = z.object({ pathname: z.string().max(400), label: z.string().trim().min(1, "Say whose ID it is.").max(80) }).parse(file);
    const db = getDb();
    const [booking] = await db.select({ id: bookings.id, propertyId: bookings.propertyId, number: bookings.number }).from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) throw new NotFoundError("Booking");
    const staff = await requirePermission("id_proofs.manage", booking.propertyId);
    if (!input.pathname.startsWith(`id-proofs/${booking.propertyId}/${booking.id}/`)) throw new RuleError("That file doesn't belong to this booking.");
    const token = privateToken();
    if (!token) throw new RuleError("Private file storage isn't set up (BLOB_PRIVATE_READ_WRITE_TOKEN).");
    const blob = await head(input.pathname, { token });
    const [property] = await db.select({ days: properties.idProofRetentionDays }).from(properties).where(eq(properties.id, booking.propertyId));
    const [row] = await db
      .insert(idProofs)
      .values({
        propertyId: booking.propertyId,
        bookingId: booking.id,
        label: input.label,
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: blob.size,
        uploadedBy: staff.userId,
        deleteAfter: new Date(Date.now() + property.days * 86_400_000),
      })
      .returning({ id: idProofs.id });
    await audit({ userId: staff.userId, propertyId: booking.propertyId, action: "id_proof.upload", entity: "id_proofs", entityId: row.id, after: { booking: booking.number, label: input.label, size: blob.size } });
    refresh();
    return { done: `ID proof saved. It is deleted on its own after ${property.days} days.` };
  } catch (error) {
    return problem(error, forbidden);
  }
}

/** Deletes an ID proof now, from the store and the booking. */
export async function deleteIdProof(proofId: string): Promise<FormState> {
  try {
    z.uuid().parse(proofId);
    const db = getDb();
    const [proof] = await db.select().from(idProofs).where(and(eq(idProofs.id, proofId), isNull(idProofs.deletedAt)));
    if (!proof) throw new NotFoundError("ID proof");
    const staff = await requirePermission("id_proofs.manage", proof.propertyId);
    const token = privateToken();
    if (token) await del(proof.pathname, { token });
    await db.update(idProofs).set({ deletedAt: new Date() }).where(eq(idProofs.id, proofId));
    await audit({ userId: staff.userId, propertyId: proof.propertyId, action: "id_proof.delete", entity: "id_proofs", entityId: proofId, before: { label: proof.label } });
    refresh();
    return { done: "ID proof deleted." };
  } catch (error) {
    return problem(error, forbidden);
  }
}

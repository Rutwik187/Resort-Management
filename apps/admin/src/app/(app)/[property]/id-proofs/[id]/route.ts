import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { get } from "@vercel/blob";
import { can, getStaff } from "@repo/auth";
import { getDb, idProofs } from "@repo/db";
import { privateToken } from "@/lib/blob";
import { audit, propertyFromCode } from "@/lib/staff";

/**
 * Opens one ID proof from the private store (ADM-08, DPP-04), only for a
 * role that may see it at this resort. Each opening goes in the audit log.
 * Nothing is cached, so the file is never kept outside the store.
 */
export async function GET(_request: Request, { params }: RouteContext<"/[property]/id-proofs/[id]">) {
  const staff = await getStaff(await headers());
  if (!staff) return new Response("Sign in first.", { status: 401 });
  const { property: code, id } = await params;
  const property = await propertyFromCode(code, staff);
  if (!can(staff, "id_proofs.manage", property.id)) return new Response("Your role can't open ID proofs.", { status: 403 });
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found.", { status: 404 });
  const [proof] = await getDb().select().from(idProofs).where(and(eq(idProofs.id, id), eq(idProofs.propertyId, property.id), isNull(idProofs.deletedAt)));
  if (!proof) return new Response("This ID proof is gone: it was deleted or its time ran out.", { status: 404 });
  const token = privateToken();
  if (!token) return new Response("Private file storage isn't set up.", { status: 503 });
  const file = await get(proof.pathname, { access: "private", token, useCache: false });
  if (!file?.stream) return new Response("The file isn't in the store.", { status: 404 });
  await audit({ userId: staff.userId, propertyId: property.id, action: "id_proof.view", entity: "id_proofs", entityId: proof.id });
  return new Response(file.stream, {
    headers: { "content-type": proof.contentType, "content-disposition": "inline", "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}

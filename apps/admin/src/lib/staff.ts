import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { assertCan, canAccessProperty, getStaff, type StaffAccess } from "@repo/auth";
import { auditLog, getDb, properties, type Permission } from "@repo/db";

/** The signed-in staff member for this request, read once per request. */
export const currentStaff = cache(async () => getStaff(await headers()));

/** For pages: the staff member, or off to sign in. */
export async function requireStaffPage(): Promise<StaffAccess> {
  const staff = await currentStaff();
  if (!staff) redirect("/sign-in");
  return staff;
}

/** For server actions: the staff member allowed this permission at this resort, or an error. */
export async function requirePermission(permission: Permission, propertyId?: string): Promise<StaffAccess> {
  const staff = await currentStaff();
  assertCan(staff, permission, propertyId);
  return staff;
}

/** A resort from its code in the address, such as /ks/rooms, if this person works there. Read once per request. */
export const propertyFromCode = cache(async (code: string, staff: StaffAccess) => {
  const [property] = await getDb().select().from(properties).where(eq(properties.code, code.toUpperCase()));
  if (!property || !canAccessProperty(staff, property.id)) notFound();
  return property;
});

/** Records a change in the audit log: who, when, from where, and the values before and after (USR-05). */
export async function audit(entry: { userId: string; propertyId?: string | null; action: string; entity: string; entityId?: string; before?: unknown; after?: unknown }) {
  const forwarded = (await headers()).get("x-forwarded-for");
  await getDb()
    .insert(auditLog)
    .values({
      userId: entry.userId,
      propertyId: entry.propertyId ?? null,
      ip: forwarded?.split(",")[0]?.trim() ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
    });
}

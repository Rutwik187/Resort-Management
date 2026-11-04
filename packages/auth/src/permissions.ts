import { and, eq } from "drizzle-orm";
import { properties, rolePermissions, roles, staffMembers, staffProperties, user, type Database, type Permission } from "@repo/db";

/** What one staff member may do, and where. Loaded per request, so changes apply at once. */
export type StaffAccess = {
  userId: string;
  name: string;
  email: string;
  role: { key: string; name: string };
  permissions: ReadonlySet<Permission>;
  /** Every resort, now and later. */
  allProperties: boolean;
  /** The resorts listed for this person. Ignored when allProperties is set. */
  propertyIds: ReadonlySet<string>;
};

/** A staff member's access, or null when they are not staff or have been deactivated. */
export async function loadStaffAccess(db: Database, userId: string): Promise<StaffAccess | null> {
  const [member] = await db
    .select({
      userId: staffMembers.userId,
      active: staffMembers.active,
      allProperties: staffMembers.allProperties,
      roleId: roles.id,
      roleKey: roles.key,
      roleName: roles.name,
      name: user.name,
      email: user.email,
    })
    .from(staffMembers)
    .innerJoin(roles, eq(roles.id, staffMembers.roleId))
    .innerJoin(user, eq(user.id, staffMembers.userId))
    .where(eq(staffMembers.userId, userId));
  if (!member?.active) return null;

  const [granted, listed] = await Promise.all([
    db.select({ permission: rolePermissions.permission }).from(rolePermissions).where(eq(rolePermissions.roleId, member.roleId)),
    db.select({ propertyId: staffProperties.propertyId }).from(staffProperties).where(eq(staffProperties.userId, userId)),
  ]);

  return {
    userId: member.userId,
    name: member.name,
    email: member.email,
    role: { key: member.roleKey, name: member.roleName },
    permissions: new Set(granted.map((row) => row.permission as Permission)),
    allProperties: member.allProperties,
    propertyIds: new Set(listed.map((row) => row.propertyId)),
  };
}

/** Whether this person works for this resort. */
export function canAccessProperty(access: StaffAccess, propertyId: string) {
  return access.allProperties || access.propertyIds.has(propertyId);
}

/**
 * The one permission check (docs/implementation-plan.md, section 7). Every
 * server action and route calls it, so the server enforces the rule, not
 * only the screen. Without a resort, it asks whether the person has the
 * permission anywhere.
 */
export function can(access: StaffAccess | null, permission: Permission, propertyId?: string): boolean {
  if (!access || !access.permissions.has(permission)) return false;
  return propertyId === undefined || canAccessProperty(access, propertyId);
}

/** Thrown when a person tries something their role or resorts don't allow. */
export class ForbiddenError extends Error {
  constructor(readonly permission: Permission, readonly propertyId?: string) {
    super(`Not allowed: ${permission}${propertyId ? ` at this resort` : ""}`);
    this.name = "ForbiddenError";
  }
}

/** Throws ForbiddenError unless can() allows it. */
export function assertCan(access: StaffAccess | null, permission: Permission, propertyId?: string): asserts access is StaffAccess {
  if (!can(access, permission, propertyId)) throw new ForbiddenError(permission, propertyId);
}

/** The resorts this person may open, for the property switcher. */
export async function accessibleProperties(db: Database, access: StaffAccess) {
  const all = await db
    .select({ id: properties.id, code: properties.code, name: properties.name })
    .from(properties)
    .where(and(eq(properties.active, true)))
    .orderBy(properties.sortOrder);
  return all.filter((property) => canAccessProperty(access, property.id));
}

"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ForbiddenError } from "@repo/auth";
import { getDb, properties, roles, session, staffMembers, staffProperties, user } from "@repo/db";
import { audit, requirePermission } from "@/lib/staff";

export type FormState = { error?: string; done?: string } | undefined;

const inviteInput = z.object({
  email: z.email("Write a valid email address.").transform((email) => email.trim().toLowerCase()),
  name: z.string().trim().min(2, "Write the person's name.").max(80),
  roleId: z.uuid("Choose a role."),
  // A ticked checkbox sends "on"; an unticked one sends nothing at all.
  allProperties: z.literal("on").optional().transform((value) => value === "on"),
  propertyIds: z.array(z.uuid()),
});

/**
 * Adds a person to the admin by email, with one role and their resorts
 * (USR-01). They can then sign in with that Google account; nobody else can.
 */
export async function inviteStaff(_state: FormState, form: FormData): Promise<FormState> {
  try {
    const admin = await requirePermission("users.manage");
    const input = inviteInput.parse({ ...Object.fromEntries(form), propertyIds: form.getAll("propertyIds") });
    if (!input.allProperties && input.propertyIds.length === 0) return { error: "Choose at least one resort, or all resorts." };

    const db = getDb();
    const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId));
    if (!role) return { error: "That role no longer exists." };
    const known = await db.select({ id: properties.id }).from(properties);
    if (input.propertyIds.some((id) => !known.some((p) => p.id === id))) return { error: "Choose resorts from the list." };

    return await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, input.email));
      const userId = existing?.id ?? randomUUID();
      if (!existing) await tx.insert(user).values({ id: userId, email: input.email, name: input.name, emailVerified: true });
      const [member] = await tx.select({ userId: staffMembers.userId }).from(staffMembers).where(eq(staffMembers.userId, userId));
      if (member) return { error: `${input.email} is already on the staff list.` };

      await tx.insert(staffMembers).values({ userId, roleId: role.id, allProperties: input.allProperties, invitedBy: admin.userId });
      if (!input.allProperties) await tx.insert(staffProperties).values(input.propertyIds.map((propertyId) => ({ userId, propertyId })));
      await audit({ userId: admin.userId, action: "staff.invite", entity: "staff_members", entityId: userId, after: { email: input.email, role: role.key, allProperties: input.allProperties, propertyIds: input.propertyIds } });
      revalidatePath("/staff");
      return { done: `${input.name} can now sign in with ${input.email}.` };
    });
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues[0]?.message ?? "Check the form." };
    if (error instanceof ForbiddenError) return { error: "Only a Super Admin can add staff." };
    throw error;
  }
}

/**
 * Deactivates or reactivates a person (USR-03). Deactivating ends their
 * sessions at once; a cached session lasts at most 5 minutes more.
 */
export async function setStaffActive(userId: string, active: boolean) {
  const admin = await requirePermission("users.manage");
  if (userId === admin.userId) return;
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(staffMembers).set({ active, deactivatedAt: active ? null : new Date() }).where(eq(staffMembers.userId, userId));
    if (!active) await tx.delete(session).where(eq(session.userId, userId));
  });
  await audit({ userId: admin.userId, action: active ? "staff.reactivate" : "staff.deactivate", entity: "staff_members", entityId: userId });
  revalidatePath("/staff");
}

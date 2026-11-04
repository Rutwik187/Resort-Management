import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { can } from "@repo/auth";
import { getDb, properties, roles, staffMembers, staffProperties, user } from "@repo/db";
import { requireStaffPage } from "@/lib/staff";
import { setStaffActive } from "./actions";
import { InviteForm } from "./invite-form";

export const metadata = { title: "Staff" };

// The URD's roles from most access to least; roles added later follow, by name.
const order = ["super_admin", "property_manager", "front_desk", "sales", "accounts"];
const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length);

/** Everyone who may sign in, with their role and resorts (USR-01, USR-03). Super Admin only. */
export default async function StaffPage() {
  const admin = await requireStaffPage();
  if (!can(admin, "users.manage")) notFound();
  const db = getDb();

  const [people, links, roleRows, resorts] = await Promise.all([
    db
      .select({ userId: staffMembers.userId, name: user.name, email: user.email, active: staffMembers.active, allProperties: staffMembers.allProperties, role: roles.name })
      .from(staffMembers)
      .innerJoin(user, eq(user.id, staffMembers.userId))
      .innerJoin(roles, eq(roles.id, staffMembers.roleId))
      .orderBy(asc(user.name)),
    db.select().from(staffProperties),
    db.select({ id: roles.id, key: roles.key, name: roles.name, description: roles.description }).from(roles).orderBy(asc(roles.name)),
    db.select({ id: properties.id, name: properties.name, code: properties.code }).from(properties).orderBy(asc(properties.sortOrder)),
  ]);

  return (
    <div>
      <h1 className="text-[1.6rem] font-semibold">Staff</h1>
      <p className="mt-1 text-muted-foreground">Only people on this list can sign in. Each has one role, at one or more resorts.</p>
      <InviteForm roles={roleRows.sort((a, b) => rank(a.key) - rank(b.key))} resorts={resorts} />

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[0.9rem]">
          <thead className="border-b border-border text-[0.8rem] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Resorts</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.userId} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <span className="block font-medium">{person.name}</span>
                  <span className="text-muted-foreground">{person.email}</span>
                </td>
                <td className="px-4 py-3">{person.role}</td>
                <td className="px-4 py-3">
                  {person.allProperties
                    ? "All resorts"
                    : links
                        .filter((link) => link.userId === person.userId)
                        .map((link) => resorts.find((r) => r.id === link.propertyId)?.code)
                        .join(", ")}
                </td>
                <td className="px-4 py-3">{person.active ? <span className="text-good">Active</span> : <span className="text-muted-foreground">Deactivated</span>}</td>
                <td className="px-4 py-3 text-right">
                  {person.userId !== admin.userId && (
                    <form action={setStaffActive.bind(null, person.userId, !person.active)}>
                      <button type="submit" className="button-quiet">
                        {person.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { can } from "@repo/auth";
import { getDb, properties, roles, staffMembers, staffProperties, user } from "@repo/db";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaffPage } from "@/lib/staff";
import { InviteForm } from "./invite-form";
import { StaffStatusButton } from "./status-button";

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

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join("");

  return (
    <>
      <PageHeader title="Staff" description="Only people on this list can sign in. Each has one role, at one or more resorts." actions={<InviteForm roles={roleRows.sort((a, b) => rank(a.key) - rank(b.key))} resorts={resorts} />} />
      <Card className="gap-0 py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Person</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Resorts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <TableRow key={person.userId}>
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(person.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{person.role}</Badge>
                </TableCell>
                <TableCell>
                  {person.allProperties ? (
                    <Badge variant="outline">All resorts</Badge>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {links
                        .filter((link) => link.userId === person.userId)
                        .map((link) => resorts.find((r) => r.id === link.propertyId))
                        .map((resort) => resort && <Badge key={resort.id} variant="outline">{resort.code}</Badge>)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {person.active ? (
                    <Badge variant="outline" className="border-good/30 bg-good/10 text-good">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Deactivated
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="pr-6 text-right">{person.userId !== admin.userId && <StaffStatusButton userId={person.userId} name={person.name} active={person.active} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

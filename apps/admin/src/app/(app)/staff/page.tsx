import { asc, eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { can } from "@repo/auth";
import { getDb, properties, roles, staffMembers, staffProperties, user } from "@repo/db";
import { properties as sites } from "@repo/sites";
import { PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { ResortMark } from "@/components/resort-mark";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { plural } from "@/lib/format";
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
      .select({ userId: staffMembers.userId, name: user.name, email: user.email, image: user.image, active: staffMembers.active, allProperties: staffMembers.allProperties, role: roles.name, roleKey: roles.key })
      .from(staffMembers)
      .innerJoin(user, eq(user.id, staffMembers.userId))
      .innerJoin(roles, eq(roles.id, staffMembers.roleId))
      .orderBy(asc(user.name)),
    db.select().from(staffProperties),
    db.select({ id: roles.id, key: roles.key, name: roles.name, description: roles.description }).from(roles).orderBy(asc(roles.name)),
    db.select({ id: properties.id, name: properties.name, code: properties.code }).from(properties).orderBy(asc(properties.sortOrder)),
  ]);

  const sortedRoles = [...roleRows].sort((a, b) => rank(a.key) - rank(b.key));
  const active = people.filter((p) => p.active).length;

  return (
    <>
      <PageHeader
        title="Staff"
        description="Only people on this list can sign in. Each has one role, at one or more resorts."
        actions={<InviteForm roles={sortedRoles} resorts={resorts} />}
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="gap-0 overflow-hidden py-0 shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-6 py-3 text-sm">
            <p className="font-medium">
              {plural(people.length, "person", "people")}
              <span className="font-normal text-muted-foreground"> · {active} active</span>
            </p>
          </div>
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
                <TableRow key={person.userId} className={person.active ? undefined : "text-muted-foreground"}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={person.name} image={person.image} className="size-9 rounded-full" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          {person.name}
                          {person.userId === admin.userId && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[0.65rem]">
                              You
                            </Badge>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={person.roleKey === "super_admin" ? "border-primary/30 bg-primary/10 text-primary" : "font-normal"}>
                      {person.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {person.allProperties ? (
                      <span className="text-sm">All resorts</span>
                    ) : (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {links
                          .filter((link) => link.userId === person.userId)
                          .map((link) => resorts.find((r) => r.id === link.propertyId))
                          .map(
                            (resort) =>
                              resort && (
                                <span key={resort.id} className="flex items-center gap-1.5 rounded-md border py-0.5 pr-2 pl-0.5 text-xs" title={resort.name}>
                                  <ResortMark code={resort.code} className="size-5 rounded" />
                                  {sites.find((site) => site.code === resort.code)?.shortName ?? resort.code}
                                </span>
                              ),
                          )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {person.active ? (
                      <Badge variant="outline" className="gap-1.5 border-good/30 bg-good/10 text-good">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-good" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/60" />
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

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Roles
            </CardTitle>
            <CardDescription>What each role may do. A person&apos;s role applies at each of their resorts.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {sortedRoles.map((role) => (
                <li key={role.id} className="grid gap-0.5 border-l-2 border-primary/20 pl-3">
                  <p className="flex items-center justify-between gap-2 text-sm font-medium">
                    {role.name}
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">{plural(people.filter((p) => p.roleKey === role.key && p.active).length, "person", "people")}</span>
                  </p>
                  {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

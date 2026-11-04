import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { ArrowRight, BedDouble, DoorOpen } from "lucide-react";
import { accessibleProperties } from "@repo/auth";
import { getDb, roomTypes, units } from "@repo/db";
import { properties as sites } from "@repo/sites";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "@/lib/format";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "All resorts" };

/** The resorts this person works for, with their rooms at a glance. Someone at one resort goes straight to it. */
export default async function HomePage() {
  const staff = await requireStaffPage();
  const db = getDb();
  const resorts = await accessibleProperties(db, staff);
  if (resorts.length === 1) redirect(`/${resorts[0].code.toLowerCase()}`);
  const ids = resorts.map((r) => r.id);
  const typeCounts = ids.length
    ? await db.select({ propertyId: roomTypes.propertyId, n: count() }).from(roomTypes).where(and(inArray(roomTypes.propertyId, ids), eq(roomTypes.status, "active"))).groupBy(roomTypes.propertyId)
    : [];
  const unitCounts = ids.length
    ? await db.select({ propertyId: units.propertyId, n: count() }).from(units).where(and(inArray(units.propertyId, ids), eq(units.status, "active"))).groupBy(units.propertyId)
    : [];

  return (
    <>
      <PageHeader title={`Hello, ${staff.name.split(" ")[0]}`} description={`${staff.role.name}, ${staff.allProperties ? "all resorts" : `${resorts.length} resorts`}. Choose a resort to see its day, bookings and rooms.`} />
      <div className="grid gap-4 sm:grid-cols-2">
        {resorts.map((resort) => {
          const site = sites.find((s) => s.code === resort.code);
          return (
            <Card key={resort.id}>
              <CardHeader className="flex flex-row items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{resort.code}</span>
                <div className="grid gap-0.5">
                  <CardTitle>{resort.name}</CardTitle>
                  <CardDescription>{site?.shortName ?? resort.code}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-6 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <BedDouble className="size-4" />
                  {plural(typeCounts.find((c) => c.propertyId === resort.id)?.n ?? 0, "room type")}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <DoorOpen className="size-4" />
                  {plural(unitCounts.find((c) => c.propertyId === resort.id)?.n ?? 0, "unit")} in use
                </span>
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link href={`/${resort.code.toLowerCase()}`}>
                    Open {site?.shortName ?? resort.name}
                    <ArrowRight />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </>
  );
}

import Link from "next/link";
import { and, count, eq, inArray } from "drizzle-orm";
import { accessibleProperties, can } from "@repo/auth";
import { getDb, roomTypes, units } from "@repo/db";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Home" };

/** The resorts this person works for, with their rooms at a glance. */
export default async function HomePage() {
  const staff = await requireStaffPage();
  const db = getDb();
  const resorts = await accessibleProperties(db, staff);
  const ids = resorts.map((r) => r.id);
  const typeCounts = ids.length
    ? await db.select({ propertyId: roomTypes.propertyId, n: count() }).from(roomTypes).where(and(inArray(roomTypes.propertyId, ids), eq(roomTypes.status, "active"))).groupBy(roomTypes.propertyId)
    : [];
  const unitCounts = ids.length
    ? await db.select({ propertyId: units.propertyId, n: count() }).from(units).where(and(inArray(units.propertyId, ids), eq(units.status, "active"))).groupBy(units.propertyId)
    : [];

  return (
    <div>
      <h1 className="text-[1.6rem] font-semibold">Hello, {staff.name.split(" ")[0]}</h1>
      <p className="mt-1 text-muted">
        {staff.role.name}, {staff.allProperties ? "all resorts" : resorts.length === 1 ? resorts[0].name : `${resorts.length} resorts`}.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {resorts.map((resort) => (
          <li key={resort.id} className="card p-5">
            <p className="text-[0.75rem] font-semibold tracking-[0.12em] text-muted">{resort.code}</p>
            <h2 className="mt-1 text-[1.2rem] font-semibold">{resort.name}</h2>
            <p className="mt-1 text-muted">
              {typeCounts.find((c) => c.propertyId === resort.id)?.n ?? 0} room types · {unitCounts.find((c) => c.propertyId === resort.id)?.n ?? 0} units in use
            </p>
            {can(staff, "rooms.manage", resort.id) || can(staff, "inventory.view", resort.id) ? (
              <Link href={`/${resort.code.toLowerCase()}/rooms`} className="button-quiet mt-4">
                Rooms and units
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

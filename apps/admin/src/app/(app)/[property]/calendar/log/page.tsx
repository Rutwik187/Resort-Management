import Link from "next/link";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { can } from "@repo/auth";
import { blocks, bookings, getDb, inventoryLog, offerings, offeringSlots, units, user } from "@repo/db";
import { isDate } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { shortDate, when } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Inventory log" };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const actionLabel = { hold: "Held while a guest paid", release: "Hold let go", book: "Booked", cancel: "Given back", block: "Blocked", unblock: "Block lifted", capacity: "Seats changed" } as const;
const reasonLabel: Record<string, string> = { maintenance: "maintenance", owner_use: "owner use", ota_allocation: "given to an OTA", wedding_buyout: "wedding or buyout", other: "other" };

/** Every change to rooms and seats, newest first, so staff can see why a room is not free on a night (INV-07). */
export default async function InventoryLogPage({ params, searchParams }: PageProps<"/[property]/calendar/log">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "inventory.view", property.id)) return <NoAccess what="the inventory log" />;

  const query = await searchParams;
  const night = isDate(one(query.night)) ? one(query.night)! : undefined;
  const unitId = one(query.unit);
  const db = getDb();
  const unitList = await db.select({ id: units.id, name: units.name }).from(units).where(eq(units.propertyId, property.id)).orderBy(asc(units.sortOrder), asc(units.name));
  const unitFilter = unitList.find((u) => u.id === unitId)?.id;

  const rows = await db
    .select({
      id: inventoryLog.id,
      at: inventoryLog.at,
      action: inventoryLog.action,
      fromDate: inventoryLog.fromDate,
      toDate: inventoryLog.toDate,
      reason: inventoryLog.reason,
      data: inventoryLog.data,
      unit: units.name,
      slot: offeringSlots.label,
      offering: offerings.name,
      number: bookings.number,
      blockReason: blocks.reason,
      by: user.name,
    })
    .from(inventoryLog)
    .leftJoin(units, eq(units.id, inventoryLog.unitId))
    .leftJoin(offeringSlots, eq(offeringSlots.id, inventoryLog.slotId))
    .leftJoin(offerings, eq(offerings.id, offeringSlots.offeringId))
    .leftJoin(bookings, eq(bookings.id, inventoryLog.bookingId))
    .leftJoin(blocks, eq(blocks.id, inventoryLog.blockId))
    .leftJoin(user, eq(user.id, inventoryLog.userId))
    .where(and(eq(inventoryLog.propertyId, property.id), night ? and(lte(inventoryLog.fromDate, night), gte(inventoryLog.toDate, night)) : undefined, unitFilter ? eq(inventoryLog.unitId, unitFilter) : undefined))
    .orderBy(desc(inventoryLog.at), desc(inventoryLog.id))
    .limit(200);
  const base = `/${property.code.toLowerCase()}`;

  return (
    <div>
      <p className="text-[0.85rem] text-muted">
        <Link href={`${base}/calendar`} className="underline-offset-2 hover:underline">
          Calendar
        </Link>{" "}
        /
      </p>
      <h1 className="mt-1 text-[1.35rem] font-semibold">Inventory log</h1>
      <p className="mt-1 text-muted">Every change to rooms and seats, newest first: holds, bookings, cancellations and blocks, with who or what made them.</p>

      <form className="card mt-4 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label" htmlFor="log-night">
            Night
          </label>
          <input id="log-night" name="night" type="date" defaultValue={night} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="log-unit">
            Room
          </label>
          <select id="log-unit" name="unit" defaultValue={unitFilter ?? ""} className="field">
            <option value="">Every room and seat</option>
            {unitList.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="button">
          Show
        </button>
        {(night || unitFilter) && (
          <Link href={`${base}/calendar/log`} className="button-quiet">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 text-muted">Nothing has changed{night ? " on that night" : ""} yet.</p>
      ) : (
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-[0.88rem]">
            <thead className="border-b border-line text-[0.78rem] text-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold">When</th>
                <th className="px-4 py-2.5 font-semibold">Room or seats</th>
                <th className="px-4 py-2.5 font-semibold">Nights or day</th>
                <th className="px-4 py-2.5 font-semibold">What</th>
                <th className="px-4 py-2.5 font-semibold">By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const guests = (row.data as { guests?: number } | null)?.guests;
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 whitespace-nowrap text-muted">{when(row.at)}</td>
                    <td className="px-4 py-2">{row.unit ?? (row.offering ? `${row.offering}, ${row.slot}${guests ? ` (${guests} guests)` : ""}` : "")}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.fromDate === row.toDate ? shortDate(row.fromDate) : `${shortDate(row.fromDate)} to ${shortDate(row.toDate)}`}</td>
                    <td className="px-4 py-2">
                      {actionLabel[row.action]}
                      {row.number && (
                        <>
                          {" · "}
                          <Link href={`${base}/bookings/${row.number.toLowerCase()}`} className="underline underline-offset-2">
                            {row.number}
                          </Link>
                        </>
                      )}
                      {row.blockReason && ` · ${reasonLabel[row.blockReason]}`}
                      {row.reason && row.action !== "block" && <span className="text-muted"> · {row.reason}</span>}
                    </td>
                    <td className="px-4 py-2 text-muted">{row.by ?? (row.action === "hold" || row.action === "release" ? "Booking engine" : "")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length === 200 && <p className="mt-2 text-[0.85rem] text-muted">The newest 200 are shown. Choose a night or a room to see older ones.</p>}
    </div>
  );
}

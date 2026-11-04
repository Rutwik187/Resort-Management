import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb, roomTypes, units } from "@repo/db";

export type NightStock = { booked: number; held: number; blocked: number };

/**
 * Each room type on sale, with its units in use and, for every night from
 * `from` to `to` (both included), how many are booked, held and blocked
 * (INV-01). Holds that have run out count as free.
 */
export async function nightlyStock(propertyId: string, from: string, to: string) {
  const db = getDb();
  const types = await db
    .select({ id: roomTypes.id, name: roomTypes.name, units: sql<number>`count(${units.id}) filter (where ${units.status} = 'active')`.mapWith(Number) })
    .from(roomTypes)
    .leftJoin(units, eq(units.roomTypeId, roomTypes.id))
    .where(and(eq(roomTypes.propertyId, propertyId), eq(roomTypes.status, "active")))
    .groupBy(roomTypes.id)
    .orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));

  const taken = await db.execute<{ roomTypeId: string; night: string } & NightStock>(sql`
    select u.room_type_id as "roomTypeId", un.night::text as night,
      (count(*) filter (where un.booking_id is not null))::int as booked,
      (count(*) filter (where un.hold_id is not null and h.expires_at > now()))::int as held,
      (count(*) filter (where un.block_id is not null))::int as blocked
    from unit_nights un
    join units u on u.id = un.unit_id and u.status = 'active'
    left join holds h on h.id = un.hold_id
    where un.property_id = ${propertyId} and un.night >= ${from} and un.night <= ${to}
    group by u.room_type_id, un.night`);

  const nights = new Map<string, NightStock>();
  for (const row of taken.rows) nights.set(`${row.roomTypeId}|${row.night}`, { booked: row.booked, held: row.held, blocked: row.blocked });
  const none: NightStock = { booked: 0, held: 0, blocked: 0 };
  return {
    types,
    /** A room type's counts for one night. */
    on: (roomTypeId: string, night: string) => nights.get(`${roomTypeId}|${night}`) ?? none,
  };
}

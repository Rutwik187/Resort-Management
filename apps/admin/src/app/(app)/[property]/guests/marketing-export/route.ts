import { headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { can, getStaff } from "@repo/auth";
import { bookings, getDb, guestProfiles, guests } from "@repo/db";
import { tableDownload } from "@/lib/export";
import { propertyFromCode } from "@/lib/staff";

/**
 * Guests who agreed to hear about offers, for Excel (ADM-10). Only a Super
 * Admin may run it. A guest agreed when they ticked the box on a website
 * booking or staff recorded it on their profile; a guest whose details were
 * removed on request is never in it.
 */
export async function GET(request: Request, { params }: RouteContext<"/[property]/guests/marketing-export">) {
  const staff = await getStaff(await headers());
  if (!staff) return new Response("Sign in first.", { status: 401 });
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "guests.export", property.id)) return new Response("Only a Super Admin can export guests.", { status: 403 });
  const key = sql<string>`coalesce('p:' || ${guests.phone}, 'e:' || lower(${guests.email}), 'g:' || ${guests.id}::text)`;
  const rows = await getDb()
    .select({
      key,
      name: sql<string>`(array_agg(${guests.name} order by ${bookings.createdAt} desc))[1]`,
      phone: sql<string | null>`max(${guests.phone})`,
      email: sql<string | null>`max(lower(${guests.email}))`,
      bookings: sql<number>`count(distinct ${bookings.id})`.mapWith(Number),
      lastBooked: sql<string>`max((${bookings.createdAt} at time zone 'Asia/Kolkata')::date)::text`,
      onWebsite: sql<boolean>`bool_or(coalesce((${bookings.consent}->>'marketing')::boolean, false))`,
      onProfile: sql<boolean>`bool_or(coalesce(${guestProfiles.marketingConsent}, false))`,
      removed: sql<boolean>`bool_or(${guestProfiles.removedAt} is not null)`,
    })
    .from(guests)
    .innerJoin(bookings, eq(bookings.guestId, guests.id))
    .leftJoin(guestProfiles, eq(guestProfiles.key, key))
    .where(and(eq(bookings.propertyId, property.id)))
    .groupBy(key);
  const agreed = rows.filter((r) => !r.removed && (r.onWebsite || r.onProfile) && (r.phone || r.email));
  const table = [
    ["Name", "Phone", "Email", "Bookings", "Last booked", "Agreed on"],
    ...agreed.map((r) => [r.name, r.phone ? `+${r.phone}` : "", r.email, r.bookings, r.lastBooked, r.onWebsite ? "Website booking" : "Recorded by staff"]),
  ];
  return tableDownload(new URL(request.url).searchParams.get("format") ?? "xlsx", `${property.code.toLowerCase()}-guests-with-marketing-consent-${new Date().toISOString().slice(0, 10)}`, [{ name: "Guests", rows: table }]);
}

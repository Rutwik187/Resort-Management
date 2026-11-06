import { headers } from "next/headers";
import { accessibleProperties, can, getStaff } from "@repo/auth";
import { getDb } from "@repo/db";
import { loadGuest } from "@/lib/guests";
import { audit, propertyFromCode } from "@/lib/staff";

/** Everything the resorts hold about a guest, as a file to give them on request (plan section 14). Super Admin only. */
export async function GET(_request: Request, { params }: RouteContext<"/[property]/guests/[id]/export">) {
  const staff = await getStaff(await headers());
  if (!staff) return new Response("Sign in first.", { status: 401 });
  const { property: code, id } = await params;
  const property = await propertyFromCode(code, staff);
  if (!can(staff, "settings.manage", property.id)) return new Response("Only a Super Admin can download a guest's data.", { status: 403 });
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("No such guest.", { status: 404 });
  const resorts = await accessibleProperties(getDb(), staff);
  const guest = await loadGuest(id, resorts.map((r) => r.id));
  if (!guest) return new Response("No such guest.", { status: 404 });
  await audit({ userId: staff.userId, propertyId: property.id, action: "guest.export", entity: "guests", entityId: id });
  const body = {
    exported: new Date().toISOString(),
    guest: { name: guest.row.name, phone: guest.row.phone, email: guest.row.email, company: guest.row.companyName, gstin: guest.row.companyGstin },
    profile: guest.profile && { tags: guest.profile.tags, note: guest.profile.note, marketingConsent: guest.profile.marketingConsent },
    bookings: guest.history.map((b) => ({ number: b.number, resort: b.code, status: b.status, checkIn: b.checkIn, checkOut: b.checkOut, visitDate: b.visitDate, total: b.totalPaise === null ? null : b.totalPaise / 100, paid: b.paidPaise / 100, booked: b.createdAt })),
    leads: guest.leads.map((l) => ({ resort: l.code, status: l.status, wanted: l.interest, came: l.createdAt })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="guest-${id}.json"`, "cache-control": "no-store" },
  });
}

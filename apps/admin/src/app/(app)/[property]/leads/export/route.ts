import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { can, getStaff } from "@repo/auth";
import { getDb, leads, user } from "@repo/db";
import { tableDownload } from "@/lib/export";
import { leadInterestLabel, leadSourceLabel, leadStatusLabel } from "@/lib/format";
import { propertyFromCode } from "@/lib/staff";

/** Every lead at a resort, for Excel or CSV (CRM-10). Super Admin and Sales only. */
export async function GET(request: Request, { params }: RouteContext<"/[property]/leads/export">) {
  const staff = await getStaff(await headers());
  if (!staff) return new Response("Sign in first.", { status: 401 });
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "leads.export", property.id)) return new Response("Your role can't export leads.", { status: 403 });
  const rows = await getDb()
    .select({ lead: leads, owner: user.name })
    .from(leads)
    .leftJoin(user, eq(user.id, leads.assignedTo))
    .where(eq(leads.propertyId, property.id))
    .orderBy(desc(leads.createdAt));
  const table = [
    ["Came on", "Name", "Phone", "Email", "Wants", "Source", "Status", "Lost reason", "Date", "Until", "Guests", "Budget", "Estimated value (₹)", "Advance (₹)", "Worked by", "Follow up", "Marketing consent", "UTM source", "UTM medium", "UTM campaign", "Message"],
    ...rows.map(({ lead, owner }) => [
      lead.createdAt.toISOString().slice(0, 10),
      lead.name,
      lead.phone ? `+${lead.phone}` : "",
      lead.email,
      leadInterestLabel[lead.interest],
      leadSourceLabel[lead.source],
      leadStatusLabel[lead.status],
      lead.lostReason,
      lead.dateFrom,
      lead.dateTo,
      lead.guests,
      lead.budget,
      lead.estimatedValuePaise === null ? null : lead.estimatedValuePaise / 100,
      lead.advancePaise ? lead.advancePaise / 100 : null,
      owner,
      lead.followUpOn ? `${lead.followUpOn}${lead.followUpTime ? ` ${lead.followUpTime.slice(0, 5)}` : ""}` : "",
      lead.consent ? (lead.consent.marketing ? "Yes" : "No") : "",
      lead.campaign?.utm_source,
      lead.campaign?.utm_medium,
      lead.campaign?.utm_campaign,
      lead.message,
    ]),
  ];
  return tableDownload(new URL(request.url).searchParams.get("format"), `${property.code.toLowerCase()}-leads-${new Date().toISOString().slice(0, 10)}`, [{ name: "Leads", rows: table }]);
}

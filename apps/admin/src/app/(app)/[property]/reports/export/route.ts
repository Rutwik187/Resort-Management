import { headers } from "next/headers";
import { can, getStaff } from "@repo/auth";
import { isDate } from "@repo/engine";
import { bookingsForExport } from "@/lib/reports";
import { propertyFromCode } from "@/lib/staff";

/** One CSV value: quoted when it holds a comma, a quote or a line break. */
const cell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const rupees = (paise: number | null) => (paise === null ? "" : (paise / 100).toFixed(2));

/** Every booking made in a period, as a CSV file for a spreadsheet (section 9: Reports, export). */
export async function GET(request: Request, { params }: RouteContext<"/[property]/reports/export">) {
  const staff = await getStaff(await headers());
  if (!staff) return new Response("Sign in first.", { status: 401 });
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "reports.view", property.id)) return new Response("Your role can't download reports.", { status: 403 });
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!isDate(from) || !isDate(to) || to < from) return new Response("Choose a period first.", { status: 400 });

  const rows = await bookingsForExport(property.id, { from, to });
  const lines = [
    ["Booking", "Booked on", "Source", "Status", "Guest", "Phone", "Email", "Check-in", "Check-out", "Visit date", "Total (₹)", "Paid (₹)", "To pay (₹)"],
    ...rows.map((r) => [
      r.number,
      r.bookedOn,
      r.source,
      r.status,
      r.guest,
      r.phone ? `+${r.phone}` : "",
      r.email,
      r.checkIn,
      r.checkOut,
      r.visitDate,
      rupees(r.totalPaise),
      rupees(r.paidPaise),
      r.totalPaise === null ? "" : rupees(Math.max(0, r.totalPaise - r.paidPaise)),
    ]),
  ];
  // A byte-order mark, so Excel reads the ₹ sign and names in Unicode.
  const body = "﻿" + lines.map((line) => line.map(cell).join(",")).join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${property.code.toLowerCase()}-bookings-${from}-to-${to}.csv"`,
      "cache-control": "no-store",
    },
  });
}

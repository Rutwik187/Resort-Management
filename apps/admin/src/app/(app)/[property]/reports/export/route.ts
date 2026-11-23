import { headers } from "next/headers";
import { accessibleProperties, can, getStaff } from "@repo/auth";
import { getDb } from "@repo/db";
import { isDate } from "@repo/engine";
import { tableDownload, type Cell } from "@/lib/export";
import { buildReport, exportCell, exportLabel, reportKinds, type ReportKind } from "@/lib/report-tables";
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
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!isDate(from) || !isDate(to) || to < from) return new Response("Choose a period first.", { status: 400 });

  // One report's tables, as an Excel workbook (a sheet each) or one CSV (URD 7.4: export to Excel and CSV; RPT-03: only what the role allows).
  const kind = reportKinds.find((k) => k.key === url.searchParams.get("report"));
  if (kind) {
    const full = can(staff, "reports.view", property.id);
    const allowed = full || can(staff, kind.needs, property.id);
    if (!allowed) return new Response("Your role can't download this report.", { status: 403 });
    let ids = [property.id];
    if (url.searchParams.get("scope") === "group" && full) ids = (await accessibleProperties(getDb(), staff)).filter((r) => can(staff, "reports.view", r.id)).map((r) => r.id);
    // The daily report is today or yesterday only.
    if (!full && kind.needs === "reports.daily" && from < new Date(Date.now() + 330 * 60_000 - 86_400_000).toISOString().slice(0, 10)) return new Response("Your role sees today's and yesterday's figures only.", { status: 403 });
    const tables = await buildReport(kind.key as ReportKind, ids, { from, to });
    const sheets = tables.map((table) => ({
      name: table.title,
      rows: [
        table.columns.map(exportLabel),
        ...table.rows.map((row) => table.columns.map((column) => exportCell(column, row[column.key]) as Cell)),
        ...(table.total ? [table.columns.map((column) => exportCell(column, table.total![column.key]) as Cell)] : []),
      ],
    }));
    const name = `${ids.length > 1 ? "group" : property.code.toLowerCase()}-${kind.key}-${from}-to-${to}`;
    const format = url.searchParams.get("format");
    if (format === "xlsx" || sheets.length === 1) return tableDownload(format, name, sheets);
    // Several tables in one CSV: each with its title, a blank line between.
    return tableDownload("csv", name, [{ name, rows: sheets.flatMap((sheet, i) => [...(i ? [[]] : []), [sheet.name], ...sheet.rows]) }]);
  }

  if (!can(staff, "reports.view", property.id)) return new Response("Your role can't download reports.", { status: 403 });

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

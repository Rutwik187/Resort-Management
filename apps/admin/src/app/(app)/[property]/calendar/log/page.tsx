import Link from "next/link";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { History } from "lucide-react";
import { can } from "@repo/auth";
import { blocks, bookings, getDb, inventoryLog, offerings, offeringSlots, units, user } from "@repo/db";
import { isDate } from "@repo/engine";
import { DateField } from "@/components/date-field";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { shortDate, when } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Inventory log" };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const actionLabel = { hold: "Held while a guest paid", release: "Hold let go", book: "Booked", cancel: "Given back", block: "Blocked", unblock: "Block lifted", capacity: "Seats changed" } as const;
const actionLook: Record<keyof typeof actionLabel, string> = {
  hold: "border-warn/30 bg-warn/10 text-warn",
  release: "text-muted-foreground",
  book: "border-good/30 bg-good/10 text-good",
  cancel: "text-muted-foreground",
  block: "border-foreground/20 bg-foreground/5",
  unblock: "text-muted-foreground",
  capacity: "border-primary/30 bg-primary/5 text-primary",
};
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
    <>
      <PageHeader title="Inventory log" description="Every change to rooms and seats, newest first: holds, bookings, cancellations and blocks, with who or what made them (INV-07)." />

      <Card className="py-4">
        <CardContent className="px-4">
          <form className="flex flex-wrap items-end gap-3">
            <Field className="w-56">
              <FieldLabel htmlFor="log-night">Night</FieldLabel>
              <DateField id="log-night" name="night" defaultValue={night} placeholder="Any night" />
            </Field>
            <Field className="w-56">
              <FieldLabel htmlFor="log-unit">Room</FieldLabel>
              <Select name="unit" defaultValue={unitFilter ?? "all"}>
                <SelectTrigger id="log-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every room and seat</SelectItem>
                  {unitList.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button type="submit">Show</Button>
            {(night || unitFilter) && (
              <Button variant="ghost" asChild>
                <Link href={`${base}/calendar/log`}>Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <History />
            </EmptyMedia>
            <EmptyTitle>Nothing changed{night ? " on that night" : ""} yet</EmptyTitle>
            <EmptyDescription>Holds, bookings and blocks appear here as they happen.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">When</TableHead>
                <TableHead>Room or seats</TableHead>
                <TableHead>Nights or day</TableHead>
                <TableHead>What</TableHead>
                <TableHead className="pr-6">By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const guests = (row.data as { guests?: number } | null)?.guests;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="pl-6 text-muted-foreground">{when(row.at)}</TableCell>
                    <TableCell className="font-medium">{row.unit ?? (row.offering ? `${row.offering}, ${row.slot}${guests ? ` (${guests} guests)` : ""}` : "")}</TableCell>
                    <TableCell>{row.fromDate === row.toDate ? shortDate(row.fromDate) : `${shortDate(row.fromDate)} – ${shortDate(row.toDate)}`}</TableCell>
                    <TableCell className="whitespace-normal">
                      <Badge variant="outline" className={actionLook[row.action]}>
                        {actionLabel[row.action]}
                      </Badge>
                      {row.number && (
                        <Link href={`${base}/bookings/${row.number.toLowerCase()}`} className="ml-2 font-medium hover:underline">
                          {row.number}
                        </Link>
                      )}
                      {row.blockReason && <span className="ml-2 text-muted-foreground">{reasonLabel[row.blockReason]}</span>}
                      {row.reason && row.action !== "block" && <span className="ml-2 text-muted-foreground">{row.reason}</span>}
                    </TableCell>
                    <TableCell className="pr-6 text-muted-foreground">{row.by ?? (row.action === "hold" || row.action === "release" ? "Booking engine" : "")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {rows.length === 200 && <p className="border-t px-6 py-3 text-sm text-muted-foreground">The newest 200 are shown. Choose a night or a room to see older ones.</p>}
        </Card>
      )}
    </>
  );
}

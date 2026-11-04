import Link from "next/link";
import { Fragment } from "react";
import { eq } from "drizzle-orm";
import { ChevronLeft, ChevronRight, History, Lock } from "lucide-react";
import { can } from "@repo/auth";
import { blocks, getDb, roomTypes, units, user } from "@repo/db";
import { addDays, dayOfWeek, isDate, todayInIndia } from "@repo/engine";
import { DateField } from "@/components/date-field";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadCalendar, type Cell } from "@/lib/calendar";
import { longDate, plural, price, statusLabel, when } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { BlockSheet, LiftBlockButton, PricesSheet, RulesSheet } from "./forms";

export const metadata = { title: "Calendar" };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const weekday = (night: string) => new Date(`${night}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
const reasonLabel: Record<string, string> = { maintenance: "Maintenance", owner_use: "Owner use", ota_allocation: "OTA", wedding_buyout: "Buyout", other: "Blocked" };
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

/** Rooms and units against dates (INV-06), with blocks, stay rules and date prices. */
export default async function CalendarPage({ params, searchParams }: PageProps<"/[property]/calendar">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "inventory.view", property.id)) return <NoAccess what="the inventory calendar" />;
  const may = (permission: Parameters<typeof can>[1]) => can(staff, permission, property.id);

  const query = await searchParams;
  const today = todayInIndia();
  const from = isDate(one(query.from)) ? one(query.from)! : today;
  const days = [7, 14, 30].includes(Number(one(query.days))) ? Number(one(query.days)) : 14;
  const calendar = await loadCalendar(property.id, from, days);
  const base = `/${property.code.toLowerCase()}/calendar`;
  const at = (start: string) => `${base}?from=${start}${days === 14 ? "" : `&days=${days}`}`;
  const last = calendar.nights[calendar.nights.length - 1];
  const bookable = may("bookings.create");

  // One block, when its cell was clicked.
  const blockId = one(query.block);
  const [block] = blockId && /^[0-9a-f-]{36}$/.test(blockId) ? await getDb().select().from(blocks).where(eq(blocks.id, blockId)) : [];
  const blockScope = block?.unitId
    ? (await getDb().select({ name: units.name }).from(units).where(eq(units.id, block.unitId)))[0]?.name
    : block?.roomTypeId
      ? `Every ${(await getDb().select({ name: roomTypes.name }).from(roomTypes).where(eq(roomTypes.id, block.roomTypeId)))[0]?.name}`
      : "The whole resort";
  const blockBy = block?.createdBy ? (await getDb().select({ name: user.name }).from(user).where(eq(user.id, block.createdBy)))[0]?.name : null;

  const typesWithUnits = calendar.types.map((type) => ({ ...type, units: calendar.units.filter((u) => u.roomTypeId === type.id) }));
  const same = (a: Cell | undefined, b: Cell | undefined) =>
    Boolean(a && b && a.kind === b.kind && ((a.kind === "booked" && b.kind === "booked" && a.bookingId === b.bookingId) || (a.kind === "blocked" && b.kind === "blocked" && a.blockId === b.blockId) || a.kind === "held"));

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Every room against the dates. The shaded rows count each room type's free rooms and give its price for the base number of guests. Click a booking or a block to open it, or a free night to book it."
        actions={
          <>
            {may("inventory.block") && <BlockSheet propertyId={property.id} types={typesWithUnits} first={from} />}
            {may("inventory.manage") && <RulesSheet propertyId={property.id} types={typesWithUnits} first={from} />}
            {may("prices.manage") && <PricesSheet propertyId={property.id} types={typesWithUnits} first={from} />}
          </>
        }
      />

      <Card className="py-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border shadow-xs">
              <Button variant="ghost" size="icon" asChild className="rounded-r-none border-r">
                <Link href={at(addDays(from, -days))} aria-label="Earlier">
                  <ChevronLeft />
                </Link>
              </Button>
              <Button variant="ghost" asChild className="rounded-none">
                <Link href={at(today)}>Today</Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="rounded-l-none border-l">
                <Link href={at(addDays(from, days))} aria-label="Later">
                  <ChevronRight />
                </Link>
              </Button>
            </div>
            <p className="text-sm font-medium">
              {longDate(from)} – {longDate(last)}
            </p>
          </div>
          <form className="flex flex-wrap items-center gap-2">
            <div className="w-52">
              <DateField id="cal-from" name="from" defaultValue={from} />
            </div>
            <Select name="days" defaultValue={String(days)}>
              <SelectTrigger className="w-32" aria-label="Nights shown">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 nights</SelectItem>
                <SelectItem value="14">14 nights</SelectItem>
                <SelectItem value="30">30 nights</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              Show
            </Button>
          </form>
        </CardContent>
      </Card>

      <ul aria-label="Key" className="-mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="size-3.5 rounded-sm border bg-card" /> Free
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3.5 rounded-sm bg-good/20" /> Booked
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3.5 rounded-sm bg-primary" /> Checked in
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3.5 rounded-sm bg-warn/20" /> Held while a guest pays
        </li>
        <li className="flex items-center gap-2">
          <span className="blocked-cell size-3.5 rounded-sm border" /> Blocked
        </li>
        <li>• a price set for the date</li>
      </ul>

      {block && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-4 text-muted-foreground" />
              {block.liftedAt ? "Lifted block" : "Block"}: {blockScope}
            </CardTitle>
            <CardDescription>
              {longDate(block.startsOn)} to {longDate(block.endsOn)} (the last night) · {reasonLabel[block.reason]}
              {block.note ? ` · ${block.note}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Made {when(block.createdAt)}
              {blockBy ? ` by ${blockBy}` : ""}
              {block.liftedAt ? `. Lifted ${when(block.liftedAt)}.` : "."}
            </p>
            {!block.liftedAt && may("inventory.block") && <LiftBlockButton blockId={block.id} />}
          </CardContent>
        </Card>
      )}

      {calendar.types.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>No room types on sale</EmptyTitle>
            <EmptyDescription>Add them on the Rooms page.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-20 min-w-44 border-b bg-card px-4 py-2 text-left text-sm font-semibold">
                    Room
                  </th>
                  {calendar.nights.map((night, i) => {
                    const weekend = property.weekendNights.includes(dayOfWeek(night));
                    const firstOfMonth = i === 0 || night.endsWith("-01");
                    return (
                      <th key={night} scope="col" className={`min-w-16 border-b border-l px-1 py-2 text-center font-normal ${weekend ? "bg-muted/60" : ""}`}>
                        <span className="block text-[0.68rem] text-muted-foreground">{weekday(night)}</span>
                        <span className={`mx-auto flex size-7 items-center justify-center rounded-full text-sm font-semibold ${night === today ? "bg-primary text-primary-foreground" : ""}`}>{Number(night.slice(8))}</span>
                        <span className="block text-[0.65rem] text-muted-foreground">{firstOfMonth ? new Date(`${night}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }) : " "}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {typesWithUnits.map((type) => {
                  const active = type.units.filter((u) => u.status === "active");
                  return (
                    <Fragment key={type.id}>
                      <tr className="bg-muted/50">
                        <th scope="row" className="sticky left-0 z-10 border-b bg-muted px-4 py-2 text-left">
                          <span className="block text-sm font-semibold">{type.name}</span>
                          <span className="text-[0.7rem] font-normal text-muted-foreground">{plural(active.length, "room")} in use</span>
                        </th>
                        {calendar.nights.map((night) => {
                          const free = active.filter((u) => !calendar.cell(u.id, night)).length;
                          const nightPrice = calendar.price(type.id, night);
                          const rule = calendar.rule(type.id, night);
                          const ruleText = rule?.stopSell ? "Stop sell" : rule?.closedToArrival ? "No arrivals" : rule?.minNights ? `Min ${rule.minNights}` : rule?.maxNights ? `Max ${rule.maxNights}` : null;
                          return (
                            <td key={night} className="border-b border-l px-1 py-1.5 text-center align-top">
                              <span className={`block font-semibold ${free === 0 ? "text-danger" : free <= property.lowStockThreshold && free < active.length ? "text-warn" : ""}`}>{free === 0 ? "Full" : `${free} free`}</span>
                              <span className="block text-[0.68rem] text-muted-foreground" title={nightPrice ? price(nightPrice.paise) : undefined}>
                                {nightPrice?.paise == null ? "No rate" : `₹${compact.format(nightPrice.paise / 100)}`}
                                {nightPrice?.source === "date" ? " •" : ""}
                              </span>
                              {ruleText && (
                                <Badge variant="outline" className="mt-0.5 border-danger/30 bg-danger/10 px-1 py-0 text-[0.62rem] text-danger">
                                  {ruleText}
                                </Badge>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {type.units.map((unit) => (
                        <tr key={unit.id}>
                          <th scope="row" className="sticky left-0 z-10 border-b bg-card px-4 py-1 text-left text-sm font-normal">
                            {unit.name}
                            {unit.status !== "active" && <span className="ml-1.5 text-[0.7rem] text-muted-foreground">({unit.status === "maintenance" ? "maintenance" : "out of use"})</span>}
                          </th>
                          {calendar.nights.map((night, i) => {
                            const cell = calendar.cell(unit.id, night);
                            const continues = i > 0 && same(calendar.cell(unit.id, calendar.nights[i - 1]), cell);
                            return (
                              <td key={night} className={`h-9 border-b p-0 ${continues ? "" : "border-l"}`}>
                                <CellView cell={cell} label={!continues} unitActive={unit.status === "active"} bookHref={bookable ? `/${property.code.toLowerCase()}/bookings/new?checkIn=${night}&checkOut=${addDays(night, 1)}` : null} blockHref={(id) => `${at(from)}&block=${id}`} code={property.code} night={night} unit={unit.name} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div>
        <Button variant="ghost" asChild className="-ml-3 text-muted-foreground">
          <Link href={`${base}/log`}>
            <History />
            Why is a room not free? See every change to the rooms
          </Link>
        </Button>
      </div>
    </>
  );
}

function CellView({ cell, label, unitActive, bookHref, blockHref, code, night, unit }: { cell: Cell | undefined; label: boolean; unitActive: boolean; bookHref: string | null; blockHref: (id: string) => string; code: string; night: string; unit: string }) {
  const box = "flex h-full w-full items-center overflow-hidden px-1.5 text-[0.72rem] whitespace-nowrap";
  if (!cell) {
    if (!unitActive) return <span className={`${box} justify-center text-muted-foreground`}>–</span>;
    return bookHref ? <Link href={bookHref} title={`${unit}, ${longDate(night)}: free. Book it.`} aria-label={`${unit}, ${longDate(night)}: free`} className={`${box} hover:bg-accent`} /> : <span className={box} aria-label="Free" />;
  }
  if (cell.kind === "booked") {
    const inHouse = cell.status === "checked_in";
    return (
      <Link
        href={`/${code.toLowerCase()}/bookings/${cell.number.toLowerCase()}`}
        title={`${cell.number} · ${cell.guest} · ${statusLabel[cell.status]}`}
        className={`${box} font-medium text-ellipsis ${inHouse ? "bg-primary text-primary-foreground" : "bg-good/20 text-foreground"} hover:opacity-85`}
      >
        {label ? cell.guest.split(" ")[0] : ""}
      </Link>
    );
  }
  if (cell.kind === "held") return <span title={`Held until ${when(cell.until)} while a guest pays`} className={`${box} bg-warn/20 text-warn`}>{label ? "Held" : ""}</span>;
  return (
    <Link href={blockHref(cell.blockId)} title={`Blocked: ${reasonLabel[cell.reason]}${cell.note ? `, ${cell.note}` : ""}`} className={`${box} blocked-cell text-muted-foreground hover:opacity-80`}>
      {label ? reasonLabel[cell.reason] : ""}
    </Link>
  );
}

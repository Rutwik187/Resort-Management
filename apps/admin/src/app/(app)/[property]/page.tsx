import Link from "next/link";
import { BedDouble, CalendarDays, DoorOpen, IndianRupee, LogIn, LogOut, Plus, TrendingUp, Wallet } from "lucide-react";
import { can } from "@repo/auth";
import { todayInIndia } from "@repo/engine";
import { BarChartCard } from "@/components/bar-chart-card";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resortToday } from "@/lib/dashboard";
import { balance, longDate, plural, rupees, shortDate } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Today" };

/** Round ticks from zero that cover the largest value, such as 0, 25K, 50K. */
function ticksFor(max: number) {
  if (max <= 0) return [0];
  const rough = max / 2;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** "morning", "afternoon" or "evening", by the hour in India. */
function partOfDay() {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()));
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

/** A resort's day: arrivals, departures, guests in, sales, rooms and charts (ADM-01, ADM-02). */
export default async function TodayPage({ params }: PageProps<"/[property]">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "dashboard.view", property.id)) return <NoAccess what="the dashboard" />;
  const may = (permission: Parameters<typeof can>[1]) => can(staff, permission, property.id);
  const money = may("reports.daily") || may("reports.view");
  const people = may("bookings.view");
  const rooms = may("inventory.view");

  const today = todayInIndia();
  const day = await resortToday(property, today);
  const base = `/${property.code.toLowerCase()}`;
  const occupancy = day.unitsInUse ? Math.round((day.tonight.booked / day.unitsInUse) * 100) : 0;
  const salesTop = Math.max(...day.salesDays.map((d) => d.paise / 100));
  const salesTicks = ticksFor(salesTop);
  const axis = (date: string) => shortDate(date).split(" ").slice(1).join(" ");

  return (
    <>
      <PageHeader
        title={`Good ${partOfDay()}, ${staff.name.split(" ")[0]}`}
        description={`${property.name} today, ${longDate(today)}.`}
        actions={
          <>
            {rooms && (
              <Button variant="outline" asChild>
                <Link href={`${base}/calendar`}>
                  <CalendarDays />
                  Calendar
                </Link>
              </Button>
            )}
            {may("bookings.create") && (
              <Button asChild>
                <Link href={`${base}/bookings/new`}>
                  <Plus />
                  New booking
                </Link>
              </Button>
            )}
          </>
        }
      />

      {(people || rooms) && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {people && (
            <>
              <StatCard label="Arriving today" value={String(day.arrivals.length)} note={`${day.arrivals.filter((b) => b.status === "checked_in").length} already in`} icon={LogIn} />
              <StatCard label="Leaving today" value={String(day.departures.length)} note={`${day.departures.filter((b) => b.status === "checked_out").length} already left`} icon={LogOut} />
              <StatCard label="In the resort" value={String(day.inHouse.length)} note={day.inHouse.length === 1 ? "booking checked in" : "bookings checked in"} icon={DoorOpen} />
            </>
          )}
          {rooms && <StatCard label="Rooms booked tonight" value={`${occupancy}%`} note={`${day.tonight.booked} of ${plural(day.unitsInUse, "room")}`} icon={BedDouble} />}
        </div>
      )}
      {money && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Sales today" value={rupees(day.sales.todayPaise)} note={plural(day.sales.todayCount, "booking")} icon={IndianRupee} />
          <StatCard label="Sales this month" value={rupees(day.sales.monthPaise)} note={plural(day.sales.monthCount, "booking")} icon={TrendingUp} />
          <StatCard label="Still to collect" value={rupees(day.collect.paise)} note={plural(day.collect.count, "booking")} icon={Wallet} />
        </div>
      )}

      {people && (
        <div className="grid gap-4 xl:grid-cols-2">
          <GuestList title="Arriving today" description="Stays starting today, and day visits." rows={day.arrivals} empty="No arrivals today." base={base} />
          <GuestList title="Leaving today" description="Stays ending today." rows={day.departures} empty="No departures today." base={base} />
          {day.inHouse.length > 0 && <GuestList title="In the resort now" description="Guests who are checked in." rows={day.inHouse} empty="" base={base} />}
        </div>
      )}

      {(money || rooms) && (
        <div className="grid gap-4 xl:grid-cols-2">
          {money && (
            <BarChartCard
              title="Sales, last 30 days"
              description="Bookings made each day that are paid or part paid, at their full price."
              series="Sales"
              columns={day.salesDays.map((d) => ({ key: d.day, label: shortDate(d.day), axis: axis(d.day), value: d.paise / 100, display: rupees(d.paise), detail: plural(d.count, "booking") }))}
              ticks={salesTicks}
              tickLabel="rupees"
              max={salesTicks[salesTicks.length - 1]}
              empty={salesTop === 0 ? "No paid bookings were made in the last 30 days." : undefined}
            />
          )}
          {rooms && (
            <BarChartCard
              title="Rooms booked, next 30 nights"
              description={`Share of the ${plural(day.unitsInUse, "room")} in use that are booked each night.`}
              series="Rooms booked"
              columns={day.nights.map((n) => ({
                key: n.night,
                label: shortDate(n.night),
                axis: axis(n.night),
                value: n.units ? (n.booked / n.units) * 100 : 0,
                display: `${n.units ? Math.round((n.booked / n.units) * 100) : 0}%`,
                detail: `${n.booked} of ${n.units}`,
              }))}
              ticks={[0, 50, 100]}
              tickLabel="percent"
              max={100}
              empty={day.unitsInUse === 0 ? "This resort has no rooms in use yet." : undefined}
            />
          )}
        </div>
      )}

      {rooms && (
        <Card>
          <CardHeader>
            <CardTitle>Rooms running low</CardTitle>
            <CardDescription>
              The next 14 nights where a room type has {plural(property.lowStockThreshold, "room")} or fewer free (INV-10). The limit is in the resort&apos;s settings.
            </CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href={`${base}/calendar`}>Open the calendar</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {day.low.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every room type has rooms free on every night.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Night</TableHead>
                    <TableHead>Room type</TableHead>
                    <TableHead className="text-right">Free</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {day.low.slice(0, 12).map((entry) => (
                    <TableRow key={`${entry.roomType}-${entry.night}`}>
                      <TableCell>{shortDate(entry.night)}</TableCell>
                      <TableCell className="font-medium">{entry.roomType}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={entry.free <= 0 ? "border-danger/30 bg-danger/10 text-danger" : "border-warn/30 bg-warn/10 text-warn"}>
                          {entry.free <= 0 ? "Full" : `${entry.free} left`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {day.low.length > 12 && <p className="mt-2 text-sm text-muted-foreground">And {day.low.length - 12} more nights.</p>}
          </CardContent>
        </Card>
      )}
    </>
  );
}

type Row = Awaited<ReturnType<typeof resortToday>>["arrivals"][number];

function GuestList({ title, description, rows, empty, base }: { title: string; description: string; rows: Row[]; empty: string; base: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} <span className="font-normal text-muted-foreground">({rows.length})</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead className="hidden sm:table-cell">Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">To pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const due = balance(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`${base}/bookings/${row.number.toLowerCase()}`} className="font-medium hover:underline">
                        {row.guestName}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{row.number}</span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{row.checkIn && row.checkOut ? `${shortDate(row.checkIn)} – ${shortDate(row.checkOut)}` : "Day visit"}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{due === null ? "To set" : due === 0 ? <span className="text-muted-foreground">Paid</span> : <span className="text-warn">{rupees(due)}</span>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

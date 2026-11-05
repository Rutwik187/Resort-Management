import Link from "next/link";
import { AlertTriangle, ArrowRight, BedDouble, CalendarDays, CircleCheck, DoorOpen, IndianRupee, LogIn, LogOut, Plus, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { can } from "@repo/auth";
import { todayInIndia } from "@repo/engine";
import { BarChartCard } from "@/components/bar-chart-card";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resortToday } from "@/lib/dashboard";
import { balance, longDate, partOfDay, plural, rupees, shortDate } from "@/lib/format";
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
  const occupancy = day.unitsInUse ? day.tonight.booked / day.unitsInUse : 0;
  const salesTop = Math.max(...day.salesDays.map((d) => d.paise / 100));
  const salesTicks = ticksFor(salesTop);
  const axis = (date: string) => shortDate(date).split(" ").slice(1).join(" ");
  const arrived = day.arrivals.filter((b) => b.status === "checked_in" || b.status === "checked_out").length;
  const left = day.departures.filter((b) => b.status === "checked_out").length;

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

      {day.unitsInUse === 0 && may("rooms.manage") && (
        <Alert className="border-primary/20 bg-primary/[0.04]">
          <Sparkles />
          <AlertTitle>{property.name} has no rooms yet</AlertTitle>
          <AlertDescription>
            <p>Add its room types and rooms, then their rates, to take bookings here and on its website.</p>
            <Button size="sm" asChild className="mt-2">
              <Link href={`${base}/rooms`}>
                <BedDouble />
                Set up rooms
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {(people || rooms) && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {people && (
            <>
              <StatCard
                label="Arriving today"
                value={String(day.arrivals.length)}
                note={day.arrivals.length ? `${arrived} of ${day.arrivals.length} checked in` : "No one is due today"}
                meter={day.arrivals.length ? { share: arrived / day.arrivals.length, label: `${arrived} of ${day.arrivals.length} arrivals checked in` } : undefined}
                icon={LogIn}
                href={`${base}/bookings?arrivingFrom=${today}&arrivingTo=${today}`}
              />
              <StatCard
                label="Leaving today"
                value={String(day.departures.length)}
                note={day.departures.length ? `${left} of ${day.departures.length} checked out` : "No one leaves today"}
                meter={day.departures.length ? { share: left / day.departures.length, label: `${left} of ${day.departures.length} departures checked out` } : undefined}
                icon={LogOut}
              />
              <StatCard
                label="In the resort"
                value={String(day.inHouse.length)}
                note={day.inHouse.length === 1 ? "Booking checked in now" : "Bookings checked in now"}
                icon={DoorOpen}
                href={`${base}/bookings?status=checked_in`}
              />
            </>
          )}
          {rooms && (
            <StatCard
              label="Rooms booked tonight"
              value={`${Math.round(occupancy * 100)}%`}
              meter={day.unitsInUse ? { share: occupancy, label: `${day.tonight.booked} of ${day.unitsInUse} rooms booked tonight` } : undefined}
              note={day.unitsInUse ? `${day.tonight.booked} of ${plural(day.unitsInUse, "room")} in use` : "No rooms in use yet"}
              icon={BedDouble}
              href={`${base}/calendar`}
            />
          )}
        </div>
      )}

      {(people || money || rooms) && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          {people && (
            <Card className={money || rooms ? "lg:col-span-2" : "lg:col-span-3"}>
              <Tabs defaultValue={day.arrivals.length || !day.inHouse.length ? "arriving" : "in"} className="gap-0">
                <CardHeader className="gap-4">
                  <CardTitle>Front desk</CardTitle>
                  <CardDescription>Who comes, goes and stays today. Open a booking to check a guest in or out.</CardDescription>
                  <CardAction className="max-sm:hidden">
                    <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                      <Link href={`${base}/bookings`}>
                        All bookings
                        <ArrowRight />
                      </Link>
                    </Button>
                  </CardAction>
                  <TabsList className="col-span-full w-full sm:w-fit">
                    <TabsTrigger value="arriving" className="group">
                      Arriving <Count n={day.arrivals.length} />
                    </TabsTrigger>
                    <TabsTrigger value="leaving" className="group">
                      Leaving <Count n={day.departures.length} />
                    </TabsTrigger>
                    <TabsTrigger value="in" className="group">
                      In now <Count n={day.inHouse.length} />
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-4">
                  <TabsContent value="arriving">
                    <GuestList rows={day.arrivals} base={base} empty="No arrivals today." show="arrival" />
                  </TabsContent>
                  <TabsContent value="leaving">
                    <GuestList rows={day.departures} base={base} empty="No departures today." show="departure" />
                  </TabsContent>
                  <TabsContent value="in">
                    <GuestList rows={day.inHouse} base={base} empty="No guests are checked in right now." show="departure" />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          )}

          {(money || rooms) && (
            <div className={`grid gap-4 ${people ? "" : "lg:col-span-3 lg:grid-cols-2"}`}>
              {money && (
                <Card>
                  <CardHeader>
                    <CardTitle>Money</CardTitle>
                    <CardDescription>Bookings paid or part paid, at their full price.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-1">
                      <MoneyRow icon={IndianRupee} label="Sales today" note={plural(day.sales.todayCount, "booking")} value={rupees(day.sales.todayPaise)} />
                      <MoneyRow icon={TrendingUp} label="Sales this month" note={plural(day.sales.monthCount, "booking")} value={rupees(day.sales.monthPaise)} />
                      <MoneyRow
                        icon={Wallet}
                        label="Still to collect"
                        note={plural(day.collect.count, "booking")}
                        value={rupees(day.collect.paise)}
                        warn={day.collect.paise > 0}
                      />
                    </ul>
                  </CardContent>
                </Card>
              )}
              {rooms && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rooms running low</CardTitle>
                    <CardDescription>
                      Next 14 nights, {plural(property.lowStockThreshold, "room")} or fewer free (INV-10).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {day.unitsInUse === 0 ? (
                      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        <BedDouble className="size-4 shrink-0" />
                        No rooms in use yet, so nothing can run low.
                      </div>
                    ) : day.low.length === 0 ? (
                      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        <CircleCheck className="size-4 shrink-0 text-good" />
                        Every room type has rooms free on every night.
                      </div>
                    ) : (
                      <ul className="grid gap-1">
                        {day.low.slice(0, 6).map((entry) => (
                          <li key={`${entry.roomType}-${entry.night}`} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
                            <AlertTriangle className={`size-4 shrink-0 ${entry.free <= 0 ? "text-danger" : "text-warn"}`} aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{entry.roomType}</span>
                              <span className="text-xs text-muted-foreground">{shortDate(entry.night)}</span>
                            </span>
                            <Badge variant="outline" className={entry.free <= 0 ? "border-danger/30 bg-danger/10 text-danger" : "border-warn/30 bg-warn/10 text-warn"}>
                              {entry.free <= 0 ? "Full" : `${entry.free} left`}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                    {day.low.length > 6 && <p className="mt-2 px-2 text-xs text-muted-foreground">And {plural(day.low.length - 6, "more night")}.</p>}
                    <Button variant="outline" size="sm" asChild className="mt-3 w-full">
                      <Link href={`${base}/calendar`}>
                        <CalendarDays />
                        Open the calendar
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {(money || rooms) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {money && (
            <BarChartCard
              title="Sales, last 30 days"
              description="Bookings made each day that are paid or part paid, at their full price."
              series="Sales"
              summary={{ label: "30 days", value: rupees(day.salesDays.reduce((sum, d) => sum + d.paise, 0)) }}
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
              summary={{
                label: "30-night average",
                value: `${day.unitsInUse ? Math.round((day.nights.reduce((sum, n) => sum + n.booked, 0) / (day.unitsInUse * day.nights.length)) * 100) : 0}%`,
              }}
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
    </>
  );
}

function Count({ n }: { n: number }) {
  return <span className="ml-1 rounded-full bg-foreground/[0.06] px-1.5 text-xs font-medium tabular-nums group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">{n}</span>;
}

function MoneyRow({ icon: Icon, label, note, value, href, warn }: { icon: typeof IndianRupee; label: string; note: string; value: string; href?: string; warn?: boolean }) {
  const body = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary ring-1 ring-primary/10 ring-inset">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{note}</span>
      </span>
      <span className={`text-base font-semibold tabular-nums ${warn ? "text-warn" : ""}`}>{value}</span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-2 py-2">{body}</div>
      )}
    </li>
  );
}

type Row = Awaited<ReturnType<typeof resortToday>>["arrivals"][number];

/** Guests for one tab: who they are, their dates, their booking's state and what they still owe. */
function GuestList({ rows, base, empty, show }: { rows: Row[]; base: string; empty: string; show: "arrival" | "departure" }) {
  if (rows.length === 0)
    return (
      <Empty className="border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">{show === "arrival" ? <LogIn /> : <LogOut />}</EmptyMedia>
          <EmptyTitle>Nothing here</EmptyTitle>
          <EmptyDescription>{empty}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <ul className="-mx-2 divide-y">
      {rows.map((row) => {
        const due = balance(row);
        return (
          <li key={row.id}>
            <Link href={`${base}/bookings/${row.number.toLowerCase()}`} className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60">
              <PersonAvatar name={row.guestName} className="size-9 rounded-full" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{row.guestName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  <span className="font-mono">{row.number}</span>
                  {" · "}
                  {row.checkIn && row.checkOut ? `${shortDate(row.checkIn)} – ${shortDate(row.checkOut)}` : "Day visit"}
                </span>
              </span>
              <StatusBadge status={row.status} className="max-sm:hidden" />
              <span className="w-20 shrink-0 text-right text-xs tabular-nums sm:w-24 sm:text-sm">
                {due === null ? <span className="text-muted-foreground">Price to set</span> : due === 0 ? <span className="text-muted-foreground">Paid</span> : <span className="font-medium text-warn">{rupees(due)} due</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

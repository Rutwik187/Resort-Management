import Link from "next/link";
import { BedDouble, Download, Inbox, IndianRupee, TrendingUp, Wallet } from "lucide-react";
import { can } from "@repo/auth";
import { addDays, isDate, todayInIndia } from "@repo/engine";
import { BarChartCard } from "@/components/bar-chart-card";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leadInterestLabel, leadSourceLabel, leadStatusLabel, longDate, methodLabel, plural, rupees, shortDate, sourceLabel } from "@/lib/format";
import { daysReport, leadsReport, occupancyReport, paymentsReport, salesReport, type Period } from "@/lib/reports";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { PeriodPicker } from "./period-picker";

export const metadata = { title: "Reports" };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The periods on offer. India's financial year starts on 1 April. */
function periodFor(key: string | undefined, from: string | undefined, to: string | undefined, today: string): Period & { key: string; label: string } {
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (key === "custom" && isDate(from) && isDate(to) && from <= to) {
    const capped = to > today ? today : to;
    return { key, from, to: capped < from ? from : capped, label: `${longDate(from)} to ${longDate(capped < from ? from : capped)}` };
  }
  switch (key) {
    case "today":
      return { key, from: today, to: today, label: "Today" };
    case "yesterday":
      return { key, from: addDays(today, -1), to: addDays(today, -1), label: "Yesterday" };
    case "last-month": {
      const first = m === 1 ? `${y - 1}-12-01` : `${y}-${pad(m - 1)}-01`;
      return { key, from: first, to: addDays(`${y}-${pad(m)}-01`, -1), label: "Last month" };
    }
    case "30":
      return { key, from: addDays(today, -29), to: today, label: "Last 30 days" };
    case "year": {
      const start = m >= 4 ? `${y}-04-01` : `${y - 1}-04-01`;
      return { key, from: start, to: today, label: "This financial year" };
    }
    default:
      return { key: "month", from: `${y}-${pad(m)}-01`, to: today, label: "This month" };
  }
}

/** Whole rupees, for averages. */
const wholeRupees = (paise: number) => rupees(Math.round(paise / 100) * 100);

/** A share as a thin bar: the chart green on a lighter step of it (the dataviz guide's meter). */
function Share({ value, of: total, label }: { value: number; of: number; label: string }) {
  const share = total ? value / total : 0;
  return (
    <div className="flex items-center gap-2">
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} className="h-1.5 w-24 overflow-hidden rounded-full bg-chart/15">
        <div className="h-full rounded-full bg-chart" style={{ width: `${share * 100}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{Math.round(share * 100)}%</span>
    </div>
  );
}

/**
 * The resort's reports (docs/implementation-plan.md, section 9: Reports):
 * sales, money received, rooms booked, day visits and leads for a period.
 * Front Desk sees today's and yesterday's figures; Sales sees leads.
 */
export default async function ReportsPage({ params, searchParams }: PageProps<"/[property]/reports">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  const full = can(staff, "reports.view", property.id);
  const daily = full || can(staff, "reports.daily", property.id);
  const leadsToo = full || can(staff, "reports.leads", property.id);
  if (!daily && !leadsToo) return <NoAccess what="reports" />;

  const query = await searchParams;
  const today = todayInIndia();
  let period = periodFor(one(query.period), one(query.from), one(query.to), today);
  // The daily report covers today or yesterday only.
  if (!full && !leadsToo && !["today", "yesterday"].includes(period.key)) period = periodFor("today", undefined, undefined, today);
  const base = `/${property.code.toLowerCase()}/reports`;

  const [sales, payments, occupancy, days, leadFigures] = await Promise.all([
    daily ? salesReport(property.id, period) : null,
    daily ? paymentsReport(property.id, period) : null,
    full ? occupancyReport(property.id, period) : null,
    daily ? daysReport(property.id, period) : null,
    leadsToo ? leadsReport(property.id, period) : null,
  ]);

  // Sales by day, or by month for a long period.
  const span = Math.round((Date.parse(period.to) - Date.parse(period.from)) / 86_400_000) + 1;
  const byMonth = span > 62;
  const columns = sales
    ? byMonth
      ? (() => {
          const months = new Map<string, { paise: number; count: number }>();
          for (let day = period.from; day <= period.to; day = addDays(day, 1)) months.set(day.slice(0, 7), months.get(day.slice(0, 7)) ?? { paise: 0, count: 0 });
          for (const [day, row] of sales.byDay) {
            const month = months.get(day.slice(0, 7));
            if (month) {
              month.paise += row.paise;
              month.count += row.count;
            }
          }
          return [...months].map(([month, row]) => {
            const name = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
            return { key: month, label: name, axis: name.split(" ")[0], value: row.paise / 100, display: rupees(row.paise), detail: plural(row.count, "booking") };
          });
        })()
      : Array.from({ length: span }, (_, i) => {
          const day = addDays(period.from, i);
          const row = sales.byDay.get(day);
          return { key: day, label: shortDate(day), axis: shortDate(day).split(" ").slice(1).join(" "), value: (row?.paise ?? 0) / 100, display: rupees(row?.paise ?? 0), detail: plural(row?.count ?? 0, "booking") };
        })
    : [];
  const top = Math.max(0, ...columns.map((c) => c.value));
  const step = top <= 0 ? 1 : [1, 2, 2.5, 5, 10].map((mult) => mult * 10 ** Math.floor(Math.log10(top / 2))).find((s) => s >= top / 2)!;
  const ticks = top <= 0 ? [0] : Array.from({ length: Math.ceil(top / step) + 1 }, (_, i) => i * step);
  const occupancyShare = occupancy && occupancy.available ? occupancy.sold / occupancy.available : 0;

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${property.name}, ${period.label.toLowerCase()}: ${longDate(period.from)}${period.from === period.to ? "" : ` to ${longDate(period.to)}`}. Sales count bookings by the day they were made; rooms count the nights stayed.`}
        actions={
          full && (
            <Button variant="outline" asChild>
              <a href={`${base}/export?from=${period.from}&to=${period.to}`} download>
                <Download />
                Bookings as CSV
              </a>
            </Button>
          )
        }
      />

      <PeriodPicker base={base} current={period.key} from={period.from} to={period.to} limited={!full && !leadsToo} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {sales && <StatCard label="Sales" value={rupees(sales.paise)} note={`${plural(sales.count, "booking")}${sales.count ? `, ${wholeRupees(sales.paise / sales.count)} each on average` : ""}`} icon={TrendingUp} />}
        {payments && <StatCard label="Money received" value={rupees(payments.paise)} note={`${plural(payments.count, "payment")} at the resort or by transfer`} icon={Wallet} />}
        {occupancy && (
          <StatCard
            label="Rooms booked"
            value={`${Math.round(occupancyShare * 100)}%`}
            meter={occupancy.available ? { share: occupancyShare, label: `${occupancy.sold} of ${occupancy.available} room nights booked` } : undefined}
            note={occupancy.available ? `${occupancy.sold} of ${occupancy.available} room nights` : "No rooms in use"}
            icon={BedDouble}
          />
        )}
        {leadFigures && <StatCard label="Leads" value={String(leadFigures.total)} note={leadFigures.total ? `${leadFigures.won} booked: ${Math.round((leadFigures.won / leadFigures.total) * 100)}% so far` : "None came in"} icon={Inbox} />}
      </div>

      {sales && (
        <BarChartCard
          title={byMonth ? "Sales by month" : "Sales by day"}
          description="Bookings made that are paid or part paid, at their full price."
          series="Sales"
          summary={{ label: period.label, value: rupees(sales.paise) }}
          columns={columns}
          ticks={ticks}
          tickLabel="rupees"
          max={ticks[ticks.length - 1]}
          empty={top === 0 ? "No paid bookings were made in this period." : undefined}
        />
      )}

      {sales && (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Where bookings came from</CardTitle>
              <CardDescription>Paid and part-paid bookings made in the period.</CardDescription>
            </CardHeader>
            <CardContent>
              {sales.bySource.length === 0 ? (
                <p className="text-sm text-muted-foreground">No paid bookings in this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.bySource.map((row) => (
                      <TableRow key={row.source}>
                        <TableCell className="font-medium">{sourceLabel[row.source]}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                        <TableCell className="text-right tabular-nums">{rupees(row.paise)}</TableCell>
                        <TableCell className="flex justify-end">
                          <Share value={row.paise} of={sales.paise} label={`${sourceLabel[row.source]}: share of sales`} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Stays, day visits and cancellations</CardTitle>
              <CardDescription>Bookings made in the period.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3">
                {[
                  { label: "Stays", count: sales.stays.count, paise: sales.stays.paise },
                  { label: "Day visits", count: sales.days.count, paise: sales.days.paise },
                  { label: "Cancelled", count: sales.cancelled.count, paise: sales.cancelled.paise, muted: true },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                    <dt className={row.muted ? "text-muted-foreground" : "font-medium"}>{row.label}</dt>
                    <dd className="text-right">
                      <span className="block font-semibold tabular-nums">{rupees(row.paise)}</span>
                      <span className="text-xs text-muted-foreground">{plural(row.count, "booking")}</span>
                    </dd>
                  </div>
                ))}
                {sales.waiting > 0 && <p className="text-xs text-muted-foreground">{plural(sales.waiting, "booking")} still waiting for payment, not counted as sales.</p>}
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {occupancy && (
        <Card className="gap-0 overflow-hidden py-0 shadow-xs">
          <CardHeader className="border-b py-5 [.border-b]:pb-5">
            <CardTitle>Rooms by type</CardTitle>
            <CardDescription>
              Nights for sale are the rooms in use times the {plural(occupancy.nights, "night")} in the period. What a stay earned is shared evenly over its nights, at the price booked.
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Room type</TableHead>
                <TableHead className="text-right">Rooms</TableHead>
                <TableHead className="text-right">Nights for sale</TableHead>
                <TableHead className="text-right">Booked</TableHead>
                <TableHead>Rooms booked</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="pr-6 text-right">A night, on average</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {occupancy.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6 font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.units}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.available}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.sold}</TableCell>
                  <TableCell>{row.available ? <Share value={row.sold} of={row.available} label={`${row.name}: rooms booked`} /> : <span className="text-xs text-muted-foreground">No rooms in use</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{rupees(row.paise)}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{row.sold && row.paise ? wholeRupees(row.paise / row.sold) : "–"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-6 font-semibold">All rooms</TableCell>
                <TableCell className="text-right tabular-nums">{occupancy.rows.reduce((sum, r) => sum + r.units, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{occupancy.available}</TableCell>
                <TableCell className="text-right tabular-nums">{occupancy.sold}</TableCell>
                <TableCell>{occupancy.available ? <Share value={occupancy.sold} of={occupancy.available} label="All rooms booked" /> : null}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{rupees(occupancy.paise)}</TableCell>
                <TableCell className="pr-6 text-right font-semibold tabular-nums">{occupancy.sold && occupancy.paise ? wholeRupees(occupancy.paise / occupancy.sold) : "–"}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}

      {(payments || days) && (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          {payments && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="size-4 text-primary" />
                  Money received, by how it was paid
                </CardTitle>
                <CardDescription>Payments recorded at the resort or by bank transfer, by the day they came in.</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.byMethod.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments recorded in this period.</p>
                ) : (
                  <Table>
                    <TableBody>
                      {payments.byMethod.map((row) => (
                        <TableRow key={row.method}>
                          <TableCell className="font-medium">{methodLabel[row.method]}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">{plural(row.count, "payment")}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{rupees(row.paise)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-semibold">Total</TableCell>
                        <TableCell className="text-right tabular-nums">{plural(payments.count, "payment")}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{rupees(payments.paise)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
          {days && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>Day visits by package</CardTitle>
                <CardDescription>Guests on day packages, activities and sittings, by the day of the visit.</CardDescription>
              </CardHeader>
              <CardContent>
                {days.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No day visits in this period.</p>
                ) : (
                  <Table>
                    <TableBody>
                      {days.map((row) => (
                        <TableRow key={row.offering}>
                          <TableCell className="font-medium">{row.offering}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">{plural(row.guests, "guest")}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{rupees(row.paise)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {leadFigures && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Leads</CardTitle>
            <CardDescription>Leads that came in during the period, and where they stand now.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-3">
            {[
              { title: "Where they stand", rows: leadFigures.byStatus.map((r) => ({ key: r.key, label: leadStatusLabel[r.key], count: r.count })) },
              { title: "What they wanted", rows: leadFigures.byInterest.map((r) => ({ key: r.key, label: leadInterestLabel[r.key], count: r.count })) },
              { title: "How they came", rows: leadFigures.bySource.map((r) => ({ key: r.key, label: leadSourceLabel[r.key], count: r.count })) },
            ].map((group) => (
              <div key={group.title} className="grid content-start gap-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.title}</p>
                {group.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None.</p>
                ) : (
                  group.rows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
                      <span>{row.label}</span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums">{row.count}</span>
                        <Share value={row.count} of={leadFigures.total} label={`${row.label}: share of leads`} />
                      </span>
                    </div>
                  ))
                )}
              </div>
            ))}
          </CardContent>
          {leadFigures.total > 0 && (
            <CardContent className="pt-0">
              <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground">
                <Link href={`/${property.code.toLowerCase()}/leads`}>Open the leads</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </>
  );
}

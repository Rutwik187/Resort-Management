import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, Plus, X } from "lucide-react";
import { z } from "zod";
import { can } from "@repo/auth";
import { allowedMoves, todayInIndia } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { findBookings, pageSize, quickCounts, type BookingFilters as Filters } from "@/lib/bookings";
import { balance, plural, rupees, shortDate, sourceLabel, statusLabel, when } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { BookingFilters } from "./filters";

export const metadata = { title: "Bookings" };

const statuses = Object.keys(allowedMoves) as (keyof typeof allowedMoves)[];
const sources = Object.keys(sourceLabel) as (keyof typeof sourceLabel)[];
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined);
const filterInput = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(statuses).optional().catch(undefined),
  source: z.enum(sources).optional().catch(undefined),
  paid: z.enum(["unpaid", "part", "full"]).optional().catch(undefined),
  arrivingFrom: day,
  arrivingTo: day,
  bookedFrom: day,
  bookedTo: day,
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

/** Every booking at the resort, with filters and search (ADM-03). */
export default async function BookingsPage({ params, searchParams }: PageProps<"/[property]/bookings">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "bookings.view", property.id)) return <NoAccess what="bookings" />;

  const raw = Object.fromEntries(Object.entries(await searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value || undefined]));
  const filters: Filters = filterInput.parse(raw);
  const { rows, total } = await findBookings([property.id], filters);
  const base = `/${property.code.toLowerCase()}/bookings`;
  const today = todayInIndia();
  const filtered = Object.entries(filters).some(([key, value]) => key !== "page" && value !== undefined && value !== "");
  const pageNumber = filters.page ?? 1;
  const linkTo = (changes: Partial<Filters>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...changes })) if (value !== undefined && value !== "") query.set(key, String(value));
    const text = query.toString();
    return text ? `${base}?${text}` : base;
  };
  const counts = await quickCounts(property.id, today);
  const views = [
    { label: "All", href: base, active: !filtered, count: counts.all },
    { label: "Arriving today", href: `${base}?arrivingFrom=${today}&arrivingTo=${today}`, active: filters.arrivingFrom === today && filters.arrivingTo === today && !filters.status, count: counts.arriving },
    { label: "In the resort", href: `${base}?status=checked_in`, active: filters.status === "checked_in" && !filters.arrivingFrom, count: counts.inHouse },
    { label: "Waiting for payment", href: `${base}?status=pending_payment`, active: filters.status === "pending_payment" && !filters.arrivingFrom, count: counts.waiting },
  ];

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every booking at this resort, newest first. Search by number, name, phone or email, or narrow the list with the filters."
        actions={
          can(staff, "bookings.create", property.id) && (
            <Button asChild>
              <Link href={`${base}/new`}>
                <Plus />
                New booking
              </Link>
            </Button>
          )
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="grid gap-3 border-b bg-muted/30 p-4">
          <nav aria-label="Quick lists" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
            {views.map((view) => (
              <Link
                key={view.label}
                href={view.href}
                aria-current={view.active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view.active ? "bg-background text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
              >
                {view.label}
                <span className={`rounded-full px-1.5 text-xs tabular-nums ${view.active ? "bg-primary/10 text-primary" : "bg-foreground/[0.06]"}`}>{view.count}</span>
              </Link>
            ))}
            {filtered && (
              <Button variant="ghost" size="sm" asChild className="ml-auto shrink-0 text-muted-foreground">
                <Link href={base}>
                  <X />
                  Clear filters
                </Link>
              </Button>
            )}
          </nav>
          <BookingFilters
            key={JSON.stringify(filters)}
            base={base}
            values={{ q: filters.q, status: filters.status, paid: filters.paid, source: filters.source, arrivingFrom: filters.arrivingFrom, arrivingTo: filters.arrivingTo, bookedFrom: filters.bookedFrom, bookedTo: filters.bookedTo }}
            statuses={statuses.map((status) => ({ value: status, label: statusLabel[status] }))}
            sources={sources.map((source) => ({ value: source, label: sourceLabel[source] }))}
          />
        </div>

        {rows.length === 0 ? (
          <Empty className="m-4 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>{filtered ? "No bookings match" : "No bookings yet"}</EmptyTitle>
              <EmptyDescription>{filtered ? "Try fewer filters, or search for another name or number." : "Bookings made on the website or here appear in this list."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Booking</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="hidden xl:table-cell">Rooms or tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">To pay</TableHead>
                <TableHead className="hidden pr-4 lg:table-cell">Booked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const due = balance(row);
                const nights = row.checkIn && row.checkOut ? Math.round((Date.parse(row.checkOut) - Date.parse(row.checkIn)) / 86_400_000) : 0;
                return (
                  <TableRow key={row.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`${base}/${row.number.toLowerCase()}`} className="font-mono text-[0.8rem] font-medium after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset">
                        {row.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <PersonAvatar name={row.guestName} className="size-8 rounded-full max-md:hidden" />
                        <div className="min-w-0">
                          <span className="block max-w-48 truncate font-medium">{row.guestName}</span>
                          {row.guestPhone && <span className="text-xs text-muted-foreground tabular-nums">+{row.guestPhone}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.checkIn && row.checkOut ? (
                        <>
                          <span className="block">
                            {shortDate(row.checkIn)} – {shortDate(row.checkOut)}
                          </span>
                          <span className="text-xs text-muted-foreground">{plural(nights, "night")}</span>
                        </>
                      ) : row.visitDate ? (
                        <>
                          <span className="block">{shortDate(row.visitDate)}</span>
                          <span className="text-xs text-muted-foreground">Day visit</span>
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden max-w-56 truncate text-muted-foreground xl:table-cell" title={row.items}>
                      {row.items}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{row.totalPaise === null ? <span className="font-normal text-muted-foreground">Rate to confirm</span> : rupees(row.totalPaise)}</TableCell>
                    <TableCell className="text-right tabular-nums">{due === null ? "" : due === 0 ? <span className="text-muted-foreground">Paid</span> : <span className="font-medium text-warn">{rupees(due)}</span>}</TableCell>
                    <TableCell className="hidden pr-4 text-muted-foreground lg:table-cell">
                      <span className="block whitespace-nowrap">{when(row.createdAt)}</span>
                      <span className="text-xs">{sourceLabel[row.source]}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <p role="status">
            {total === 0 ? "No bookings" : total > pageSize ? `${(pageNumber - 1) * pageSize + 1}–${Math.min(total, pageNumber * pageSize)} of ${total} bookings` : plural(total, "booking")}
          </p>
          {total > pageSize && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild={pageNumber > 1} disabled={pageNumber <= 1}>
                {pageNumber > 1 ? (
                  <Link href={linkTo({ page: pageNumber - 1 })}>
                    <ChevronLeft />
                    Newer
                  </Link>
                ) : (
                  <span>
                    <ChevronLeft />
                    Newer
                  </span>
                )}
              </Button>
              <Button variant="outline" size="sm" asChild={pageNumber * pageSize < total} disabled={pageNumber * pageSize >= total}>
                {pageNumber * pageSize < total ? (
                  <Link href={linkTo({ page: pageNumber + 1 })}>
                    Older
                    <ChevronRight />
                  </Link>
                ) : (
                  <span>
                    Older
                    <ChevronRight />
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

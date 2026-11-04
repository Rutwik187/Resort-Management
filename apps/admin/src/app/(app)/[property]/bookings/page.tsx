import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, Plus } from "lucide-react";
import { z } from "zod";
import { can } from "@repo/auth";
import { allowedMoves, todayInIndia } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { findBookings, pageSize, type BookingFilters as Filters } from "@/lib/bookings";
import { balance, price, rupees, shortDate, sourceLabel, statusLabel, when } from "@/lib/format";
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
  const views = [
    { label: "All", href: base, active: !filtered },
    { label: "Arriving today", href: `${base}?arrivingFrom=${today}&arrivingTo=${today}`, active: filters.arrivingFrom === today && filters.arrivingTo === today && !filters.status },
    { label: "In the resort", href: `${base}?status=checked_in`, active: filters.status === "checked_in" && !filters.arrivingFrom },
    { label: "Waiting for payment", href: `${base}?status=pending_payment`, active: filters.status === "pending_payment" && !filters.arrivingFrom },
  ];

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every booking at this resort. Search by number, name, phone or email, or narrow the list with the filters."
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

      <Card>
        <CardHeader className="gap-3">
          <nav aria-label="Quick lists" className="flex flex-wrap gap-2">
            {views.map((view) => (
              <Button key={view.label} variant={view.active ? "secondary" : "ghost"} size="sm" asChild className={view.active ? "font-semibold" : "text-muted-foreground"}>
                <Link href={view.href} aria-current={view.active ? "page" : undefined}>
                  {view.label}
                </Link>
              </Button>
            ))}
          </nav>
        </CardHeader>
        <CardContent className="border-t pt-6">
          <BookingFilters
            base={base}
            values={{ q: filters.q, status: filters.status, paid: filters.paid, source: filters.source, arrivingFrom: filters.arrivingFrom, arrivingTo: filters.arrivingTo, bookedFrom: filters.bookedFrom, bookedTo: filters.bookedTo }}
            statuses={statuses.map((status) => ({ value: status, label: statusLabel[status] }))}
            sources={sources.map((source) => ({ value: source, label: sourceLabel[source] }))}
          />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>{filtered ? "No bookings match" : "No bookings yet"}</EmptyTitle>
            <EmptyDescription>{filtered ? "Try fewer filters, or search for another name or number." : "Bookings made on the website or here appear in this list."}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Booking</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Rooms or tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">To pay</TableHead>
                <TableHead className="pr-6">Booked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const due = balance(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="pl-6 font-medium">
                      <Link href={`${base}/${row.number.toLowerCase()}`} className="hover:underline">
                        {row.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="block font-medium">{row.guestName}</span>
                      {row.guestPhone && <span className="text-xs text-muted-foreground">+{row.guestPhone}</span>}
                    </TableCell>
                    <TableCell>{row.checkIn && row.checkOut ? `${shortDate(row.checkIn)} – ${shortDate(row.checkOut)}` : row.visitDate ? shortDate(row.visitDate) : ""}</TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground" title={row.items}>
                      {row.items}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{price(row.totalPaise)}</TableCell>
                    <TableCell className="text-right tabular-nums">{due === null ? "" : due === 0 ? <span className="text-muted-foreground">Paid</span> : rupees(due)}</TableCell>
                    <TableCell className="pr-6 text-muted-foreground">
                      {when(row.createdAt)}
                      <span className="block text-xs">{sourceLabel[row.source]}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3 text-sm text-muted-foreground">
            <p role="status">
              {total} {total === 1 ? "booking" : "bookings"}
              {total > pageSize ? `, page ${pageNumber} of ${Math.ceil(total / pageSize)}` : ""}
            </p>
            {total > pageSize && (
              <div className="flex gap-2">
                {pageNumber > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={linkTo({ page: pageNumber - 1 })}>
                      <ChevronLeft />
                      Newer
                    </Link>
                  </Button>
                )}
                {pageNumber * pageSize < total && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={linkTo({ page: pageNumber + 1 })}>
                      Older
                      <ChevronRight />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

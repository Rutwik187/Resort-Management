import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import { accessibleProperties, can } from "@repo/auth";
import { getDb } from "@repo/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { findBookings } from "@/lib/bookings";
import { price, shortDate } from "@/lib/format";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Find a booking" };

/** One search box for every resort this person can see: booking numbers, phone numbers, names and emails. */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const staff = await requireStaffPage();
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const resorts = (await accessibleProperties(getDb(), staff)).filter((resort) => can(staff, "bookings.view", resort.id));
  const { rows, total } = q ? await findBookings(resorts.map((r) => r.id), { q }) : { rows: [], total: 0 };

  // A booking number typed in full goes straight to the booking.
  if (rows.length === 1 && rows[0].number.toLowerCase() === q.toLowerCase()) {
    redirect(`/${rows[0].propertyCode.toLowerCase()}/bookings/${rows[0].number.toLowerCase()}`);
  }

  return (
    <>
      <PageHeader title="Find a booking" description="Search every resort you work at by booking number, phone, name or email." />
      <form role="search" className="flex max-w-xl gap-2">
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput id="search-q" name="q" type="search" defaultValue={q} placeholder="Booking number, phone, name or email" aria-label="Booking number, phone, name or email" />
        </InputGroup>
        <Button type="submit">Search</Button>
      </form>
      {q && rows.length === 0 && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>Nothing matches &ldquo;{q}&rdquo;</EmptyTitle>
            <EmptyDescription>Check the number, or try part of the name or the last digits of the phone.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {rows.length > 0 && (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Booking</TableHead>
                <TableHead>Resort</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6 font-medium">
                    <Link href={`/${row.propertyCode.toLowerCase()}/bookings/${row.number.toLowerCase()}`} className="hover:underline">
                      {row.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.propertyCode}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="block font-medium">{row.guestName}</span>
                    {row.guestPhone && <span className="text-xs text-muted-foreground">+{row.guestPhone}</span>}
                  </TableCell>
                  <TableCell>{row.checkIn ? `${shortDate(row.checkIn)} – ${shortDate(row.checkOut!)}` : row.visitDate ? shortDate(row.visitDate) : ""}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{price(row.totalPaise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="border-t px-6 py-3 text-sm text-muted-foreground" role="status">
            {total} {total === 1 ? "booking matches" : "bookings match"} &ldquo;{q}&rdquo;{total > rows.length ? `; the newest ${rows.length} are shown` : ""}.
          </p>
        </Card>
      )}
    </>
  );
}

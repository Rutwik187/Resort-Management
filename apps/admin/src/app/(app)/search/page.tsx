import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import { accessibleProperties, can } from "@repo/auth";
import { getDb } from "@repo/db";
import { properties as sites } from "@repo/sites";
import { PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { ResortMark } from "@/components/resort-mark";
import { StatusBadge } from "@/components/status-badge";
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
      <form role="search" className="flex max-w-2xl gap-2">
        <InputGroup className="h-11 shadow-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput id="search-q" name="q" type="search" defaultValue={q} autoFocus={!q} placeholder="Booking number, phone, name or email" aria-label="Booking number, phone, name or email" className="text-base" />
        </InputGroup>
        <Button type="submit" size="lg" className="h-11">
          Search
        </Button>
      </form>
      {!q && (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>Search every resort at once</EmptyTitle>
            <EmptyDescription>Type a booking number such as KS-26-000001, the last digits of a phone, or part of a name or email. A full booking number opens the booking.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
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
        <Card className="gap-0 overflow-hidden py-0 shadow-xs">
          <Table>
            <TableHeader className="bg-muted/30">
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
                <TableRow key={row.id} className="relative">
                  <TableCell className="pl-6">
                    <Link
                      href={`/${row.propertyCode.toLowerCase()}/bookings/${row.number.toLowerCase()}`}
                      className="font-mono text-[0.8rem] font-medium after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
                    >
                      {row.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <ResortMark code={row.propertyCode} className="size-6 rounded-md" />
                      {sites.find((site) => site.code === row.propertyCode)?.shortName ?? row.propertyCode}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <PersonAvatar name={row.guestName} className="size-8 rounded-full max-md:hidden" />
                      <div>
                        <span className="block font-medium">{row.guestName}</span>
                        {row.guestPhone && <span className="text-xs text-muted-foreground tabular-nums">+{row.guestPhone}</span>}
                      </div>
                    </div>
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
          <p className="border-t bg-muted/30 px-6 py-3 text-sm text-muted-foreground" role="status">
            {total} {total === 1 ? "booking matches" : "bookings match"} &ldquo;{q}&rdquo;{total > rows.length ? `; the newest ${rows.length} are shown` : ""}.
          </p>
        </Card>
      )}
    </>
  );
}

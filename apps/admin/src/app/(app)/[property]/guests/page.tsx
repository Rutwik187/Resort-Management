import Link from "next/link";
import { Contact, Search, X } from "lucide-react";
import { can } from "@repo/auth";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ago, plural, rupees, shortDate } from "@/lib/format";
import { findGuests } from "@/lib/guests";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Guests" };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Everyone who has booked at the resort (ADM-09): their bookings and spend,
 * and when they last came. A guest who booked twice, with the same phone or
 * email, is one guest here.
 */
export default async function GuestsPage({ params, searchParams }: PageProps<"/[property]/guests">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "bookings.view", property.id)) return <NoAccess what="guests" />;
  const query = await searchParams;
  const q = one(query.q)?.trim().slice(0, 100) || undefined;
  const returning = one(query.returning) === "1";
  const rows = await findGuests(property.id, { q, returning });
  const base = `/${property.code.toLowerCase()}/guests`;

  return (
    <>
      <PageHeader title="Guests" description="Everyone who has booked here, with what they booked and spent. Bookings with the same phone, or email, come together as one guest." />

      <Card className="gap-0 overflow-hidden py-0">
        <form role="search" className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-4">
          {returning && <input type="hidden" name="returning" value="1" />}
          <InputGroup className="max-w-80 min-w-56 flex-1 bg-background">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput name="q" type="search" defaultValue={q} placeholder="Name, phone or email" aria-label="Search guests" />
          </InputGroup>
          <Button variant={returning ? "secondary" : "ghost"} size="sm" asChild className={returning ? "font-semibold" : "text-muted-foreground"}>
            <Link href={returning ? (q ? `${base}?q=${encodeURIComponent(q)}` : base) : `${base}?returning=1${q ? `&q=${encodeURIComponent(q)}` : ""}`}>Came back</Link>
          </Button>
          {(q || returning) && (
            <Button variant="ghost" size="sm" asChild className="ml-auto text-muted-foreground">
              <Link href={base}>
                <X />
                Clear
              </Link>
            </Button>
          )}
        </form>
        {rows.length === 0 ? (
          <Empty className="m-4 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Contact />
              </EmptyMedia>
              <EmptyTitle>{q || returning ? "No guests match" : "No guests yet"}</EmptyTitle>
              <EmptyDescription>{q || returning ? "Try another name or number." : "Guests appear here with their first booking."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Guest</TableHead>
                <TableHead className="hidden md:table-cell">Tags</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="hidden lg:table-cell">Last came</TableHead>
                <TableHead className="pr-4 text-right">Last booked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key} className="relative">
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2.5">
                      <PersonAvatar name={row.name} className="size-8 rounded-full max-md:hidden" />
                      <div className="min-w-0">
                        <Link href={`${base}/${row.guestId}`} className="block truncate font-medium after:absolute after:inset-0 after:content-[''] hover:underline">
                          {row.name}
                        </Link>
                        <span className="text-xs text-muted-foreground tabular-nums">{row.phone ? `+${row.phone}` : (row.email ?? "No phone or email")}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {row.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.bookings}
                    {row.bookings >= 2 && <span className="sr-only">, came back</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{rupees(row.spent)}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{row.lastVisit ? shortDate(row.lastVisit) : "Not yet"}</TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground">{ago(row.lastBooked)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="border-t bg-muted/30 px-4 py-3 text-sm text-muted-foreground" role="status">
          {plural(rows.length, "guest")}
          {rows.length === 200 ? ", the latest 200" : ""}
        </div>
      </Card>
    </>
  );
}

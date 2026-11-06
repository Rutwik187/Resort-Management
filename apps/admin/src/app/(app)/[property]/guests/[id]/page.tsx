import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { accessibleProperties, can } from "@repo/auth";
import { getDb } from "@repo/db";
import { properties as sites } from "@repo/sites";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { NoAccess } from "@/components/no-access";
import { PersonAvatar } from "@/components/person-avatar";
import { ResortMark } from "@/components/resort-mark";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ago, leadInterestLabel, plural, price, rupees, shortDate, when } from "@/lib/format";
import { loadGuest } from "@/lib/guests";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { GuestProfileForm, RemoveGuestButton } from "../forms";

export const metadata = { title: "Guest" };

const sold = ["part_paid", "confirmed", "checked_in", "checked_out", "no_show"];

/** One guest across their bookings (ADM-10): contact, history, spend, tags and notes, and their data on request. */
export default async function GuestPage({ params }: PageProps<"/[property]/guests/[id]">) {
  const staff = await requireStaffPage();
  const { property: code, id } = await params;
  const property = await propertyFromCode(code, staff);
  if (!can(staff, "bookings.view", property.id)) return <NoAccess what="guests" />;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const resorts = (await accessibleProperties(getDb(), staff)).filter((r) => can(staff, "bookings.view", r.id));
  const guest = await loadGuest(id, resorts.map((r) => r.id));
  if (!guest || guest.history.length === 0) notFound();
  const { row, history, profile } = guest;
  const paid = history.filter((b) => sold.includes(b.status));
  const spent = paid.reduce((sum, b) => sum + (b.totalPaise ?? 0), 0);
  const nights = paid.reduce((sum, b) => sum + (b.checkIn && b.checkOut ? Math.round((Date.parse(b.checkOut) - Date.parse(b.checkIn)) / 86_400_000) : 0), 0);
  const visits = paid.map((b) => b.checkIn ?? b.visitDate).filter((d): d is string => Boolean(d)).sort();
  const removed = Boolean(profile?.removedAt);
  const edit = can(staff, "bookings.modify", property.id) && !removed;
  const owner = can(staff, "settings.manage", property.id);
  const base = `/${property.code.toLowerCase()}`;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <PersonAvatar name={row.name} className="size-12 rounded-full text-base max-sm:hidden" />
          <div className="min-w-0 space-y-1.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{row.name}</h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {paid.length >= 2 && <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Came back</Badge>}
              {(profile?.tags ?? []).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
              <span>First booked {ago(history[history.length - 1].createdAt)}</span>
            </p>
          </div>
        </div>
        {!removed && row.phone && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={`tel:+${row.phone}`}>
                <Phone />
                Call
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`https://wa.me/${row.phone}`} target="_blank" rel="noreferrer">
                <MessageCircle />
                WhatsApp
              </a>
            </Button>
          </div>
        )}
      </div>

      {removed && (
        <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" />
          Their personal details were removed on request, {when(profile!.removedAt!)}. Their bookings stay, without them.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Bookings" value={String(paid.length)} note={history.length > paid.length ? `And ${plural(history.length - paid.length, "other")} not paid or cancelled` : "All paid or part paid"} />
        <StatCard label="Spent" value={rupees(spent)} note="At the price of each booking" />
        <StatCard label="Nights stayed" value={String(nights)} note={nights ? "Across their stays" : "Day visits only, so far"} />
        <StatCard label="Last came" value={visits.length ? shortDate(visits[visits.length - 1]) : "Not yet"} note={visits.length ? `First came ${shortDate(visits[0])}` : "Their first visit is ahead"} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-4">
          <Card className="gap-0 overflow-hidden py-0 shadow-xs">
            <CardHeader className="border-b py-5 [.border-b]:pb-5">
              <CardTitle>Bookings</CardTitle>
              <CardDescription>At the resorts you work at, newest first.</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Booking</TableHead>
                  <TableHead>Resort</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((booking) => (
                  <TableRow key={booking.id} className="relative">
                    <TableCell className="pl-6">
                      <Link href={`/${booking.code.toLowerCase()}/bookings/${booking.number.toLowerCase()}`} className="font-mono text-[0.8rem] font-medium after:absolute after:inset-0 after:content-[''] hover:underline">
                        {booking.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <ResortMark code={booking.code} className="size-5 rounded" />
                        {sites.find((s) => s.code === booking.code)?.shortName ?? booking.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{booking.checkIn && booking.checkOut ? `${shortDate(booking.checkIn)} – ${shortDate(booking.checkOut)}` : booking.visitDate ? `${shortDate(booking.visitDate)}, day visit` : ""}</TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{price(booking.totalPaise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {guest.leads.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>Their leads</CardTitle>
                <CardDescription>What they asked before booking, or since.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-1">
                  {guest.leads.map((lead) => (
                    <li key={lead.id}>
                      <Link href={`/${lead.code.toLowerCase()}/leads/${lead.id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                        <span>
                          {leadInterestLabel[lead.interest]} <span className="text-muted-foreground">· {ago(lead.createdAt)}</span>
                        </span>
                        <LeadStatusBadge status={lead.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="grid content-start gap-4">
          {!removed && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {row.phone && (
                  <a href={`tel:+${row.phone}`} className="flex items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted/60">
                    <Phone className="size-4 text-muted-foreground" />
                    <span className="tabular-nums">+{row.phone}</span>
                  </a>
                )}
                {row.email && (
                  <a href={`mailto:${row.email}`} className="flex items-center gap-3 rounded-lg border px-3 py-2 break-all hover:bg-muted/60">
                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                    {row.email}
                  </a>
                )}
                {row.companyName && (
                  <p className="pt-1">
                    {row.companyName}
                    {row.companyGstin && <span className="block text-muted-foreground">GSTIN {row.companyGstin}</span>}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>About this guest</CardTitle>
              <CardDescription>Kept across all their bookings.</CardDescription>
            </CardHeader>
            <CardContent>
              {edit ? (
                <GuestProfileForm guestId={row.id} propertyId={property.id} tags={profile?.tags ?? []} note={profile?.note ?? null} consent={profile?.marketingConsent ?? false} />
              ) : (
                <div className="grid gap-2 text-sm">
                  <p>{profile?.note || <span className="text-muted-foreground">No note yet.</span>}</p>
                  <p className="text-muted-foreground">{profile?.marketingConsent ? "Agreed to hear about offers." : "Hasn't agreed to hear about offers."}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {owner && !removed && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>Their data</CardTitle>
                <CardDescription>On a guest&apos;s request, under India&apos;s data protection law: a copy of what the resorts hold, or removing it.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-1">
                <Button variant="ghost" asChild className="justify-start">
                  <a href={`${base}/guests/${row.id}/export`} download>
                    <Download />
                    Download their data
                  </a>
                </Button>
                <RemoveGuestButton guestId={row.id} propertyId={property.id} name={row.name} />
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

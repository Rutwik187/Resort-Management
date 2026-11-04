import { notFound } from "next/navigation";
import { ArrowRightLeft, CalendarCheck, CircleAlert, Clock, IndianRupee, Mail, MessageCircle, MessageSquareText, Phone, PencilLine, Sparkles } from "lucide-react";
import { can } from "@repo/auth";
import { getDb } from "@repo/db";
import { freeUnits, todayInIndia, type Quote } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadBooking, type LoadedBooking } from "@/lib/bookings";
import { balance, clock, longDate, methodLabel, partyLabel, plural, price, rupees, shortDate, sourceLabel, statusLabel, when } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { CancelForm, MoveButton, NoShowButton, NoteForm, PaymentForm, PriceForm, PrintButton, RoomForm } from "./forms";

export async function generateMetadata({ params }: PageProps<"/[property]/bookings/[number]">) {
  return { title: (await params).number.toUpperCase() };
}

const open = ["pending_payment", "part_paid", "confirmed", "checked_in"];

/** One booking: guest, stay, prices, payments, actions and timeline (ADM-04, ADM-05). */
export default async function BookingPage({ params }: PageProps<"/[property]/bookings/[number]">) {
  const staff = await requireStaffPage();
  const { property: code, number } = await params;
  const property = await propertyFromCode(code, staff);
  if (!can(staff, "bookings.view", property.id)) return <NoAccess what="bookings" />;
  const loaded = await loadBooking(property.id, number);
  if (!loaded) notFound();
  const { booking, guest, items, payments, hold, bands, people } = loaded;

  const may = (permission: Parameters<typeof can>[1]) => can(staff, permission, property.id);
  const today = todayInIndia();
  const due = booking.checkIn ?? booking.visitDate;
  const arrived = due !== null && today >= due;
  const left = balance(booking);
  const quote = booking.quote as Quote | null;
  const roomsBooked = booking.status === "confirmed" || booking.status === "part_paid";
  const takesMoney = ["pending_payment", "part_paid", "confirmed", "checked_in", "checked_out"].includes(booking.status) && left !== 0;
  const nights = quote?.lines.find((l) => l.kind === "stay")?.nights.length ?? 0;
  const acts = open.includes(booking.status) && (may("bookings.modify") || may("bookings.cancel") || may("prices.manage"));

  // Free rooms of the same type, for moving a stay before check-in.
  const moves = new Map<string, { id: string; name: string }[]>();
  if (roomsBooked && may("bookings.modify") && booking.checkIn && booking.checkOut) {
    for (const { item } of items) {
      if (item.kind === "stay" && item.roomTypeId) moves.set(item.id, await freeUnits(getDb(), item.roomTypeId, booking.checkIn, booking.checkOut));
    }
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {booking.number}
            <StatusBadge status={booking.status} className="text-sm" />
          </span>
        }
        description={
          <>
            {sourceLabel[booking.source]} booking, made {when(booking.createdAt)}
            {booking.createdBy ? ` by ${people.get(booking.createdBy) ?? "staff"}` : ""}. <span className="hidden print:inline">{property.name}.</span>
          </>
        }
        actions={<PrintButton />}
      />

      {booking.status === "pending_payment" && hold && (
        <Alert className="border-warn/30 bg-warn/5 text-warn print:hidden">
          <Clock />
          <AlertTitle>{hold.expiresAt > new Date() ? `Held until ${clock(hold.expiresAt)}` : `The hold ran out at ${clock(hold.expiresAt)}`}</AlertTitle>
          <AlertDescription className="text-warn/90">
            {hold.expiresAt > new Date() ? "Record a payment to keep the rooms or seats." : "The rooms or seats are back on sale. A payment now takes them again if they are still free."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr]">
        <aside className="grid content-start gap-4 lg:col-start-2 lg:row-start-1">
          <Card>
            <CardHeader>
              <CardTitle>Guest</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="text-base font-medium">{guest.name}</p>
              {guest.phone && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <a href={`tel:+${guest.phone}`} className="flex items-center gap-2 hover:underline">
                    <Phone className="size-4 text-muted-foreground" />+{guest.phone}
                  </a>
                  <a href={`https://wa.me/${guest.phone}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline print:hidden">
                    <MessageCircle className="size-4 text-muted-foreground" />
                    WhatsApp
                  </a>
                </div>
              )}
              {guest.email && (
                <a href={`mailto:${guest.email}`} className="flex items-center gap-2 break-all hover:underline">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  {guest.email}
                </a>
              )}
              {(guest.companyName || guest.companyGstin) && (
                <>
                  <Separator />
                  <p>{guest.companyName}</p>
                  {guest.companyGstin && <p className="text-muted-foreground">GSTIN {guest.companyGstin}</p>}
                </>
              )}
            </CardContent>
          </Card>

          {acts && (
            <Card className="print:hidden">
              <CardHeader>
                <CardTitle>Front desk</CardTitle>
                {booking.status === "pending_payment" && <CardDescription>Record a payment first. Check-in opens once the booking is paid or part paid.</CardDescription>}
                {roomsBooked && !arrived && <CardDescription>Check-in opens on {shortDate(due!)}.</CardDescription>}
              </CardHeader>
              <CardContent className="grid gap-2">
                {may("bookings.modify") && roomsBooked && arrived && <MoveButton bookingId={booking.id} to="checked_in" />}
                {may("bookings.modify") && booking.status === "checked_in" && <MoveButton bookingId={booking.id} to="checked_out" />}
                {may("bookings.modify") && roomsBooked && arrived && <NoShowButton bookingId={booking.id} />}
                {may("prices.manage") && booking.status !== "checked_out" && <PriceForm bookingId={booking.id} current={booking.totalPaise === null ? "" : String(booking.totalPaise / 100)} />}
                {may("bookings.cancel") && booking.status !== "checked_in" && <CancelForm bookingId={booking.id} />}
              </CardContent>
            </Card>
          )}
        </aside>

        <div className="grid min-w-0 content-start gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Card>
            <CardHeader>
              <CardTitle>{booking.checkIn && booking.checkOut ? "Stay" : "Day visit"}</CardTitle>
              <CardDescription>
                {booking.checkIn && booking.checkOut ? `${longDate(booking.checkIn)} to ${longDate(booking.checkOut)} · ${plural(nights, "night")}` : booking.visitDate ? longDate(booking.visitDate) : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {items.map(({ item, roomTypeName, unitName, offeringName, slotLabel }, index) => {
                const line = quote?.lines[index];
                return (
                  <div key={item.id} className="grid gap-2 rounded-lg border p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">
                        {item.kind === "stay" ? roomTypeName : offeringName}
                        <span className="font-normal text-muted-foreground"> · {item.kind === "stay" ? (unitName ?? "Room to assign") : slotLabel}</span>
                      </p>
                      <p className="font-semibold tabular-nums">{price(item.amountPaise)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {partyLabel(item.party, bands)}
                      {item.extraBeds ? `, ${plural(item.extraBeds, "extra bed")}` : ""}
                    </p>
                    {line?.kind === "stay" && line.nights.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger className="text-sm text-muted-foreground underline-offset-4 hover:underline">Price for each night</CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <Table>
                            <TableBody>
                              {line.nights.map((night) => (
                                <TableRow key={night.night}>
                                  <TableCell className="py-1.5">{shortDate(night.night)}</TableCell>
                                  <TableCell className="py-1.5 text-muted-foreground">{night.source === "base" ? "Base rate" : night.source === "date" ? "Price for the date" : `${night.source} season`}</TableCell>
                                  <TableCell className="py-1.5 text-right tabular-nums">{price(night.paise)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    {moves.has(item.id) && <RoomForm bookingItemId={item.id} rooms={moves.get(item.id)!} />}
                  </div>
                );
              })}
              {booking.notes && <p className="text-sm">Notes when booked: {booking.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Price and payments</CardTitle>
              {quote?.totalPaise !== undefined && booking.totalPaise !== quote?.totalPaise && <CardDescription>The rates gave {price(quote?.totalPaise)}; staff set this price (see the timeline).</CardDescription>}
            </CardHeader>
            <CardContent className="grid gap-4">
              <dl className="grid grid-cols-3 divide-x rounded-lg border text-center">
                <div className="p-3">
                  <dt className="text-xs text-muted-foreground">Total</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{price(booking.totalPaise)}</dd>
                </div>
                <div className="p-3">
                  <dt className="text-xs text-muted-foreground">Paid</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{rupees(booking.paidPaise)}</dd>
                </div>
                <div className="p-3">
                  <dt className="text-xs text-muted-foreground">To pay</dt>
                  <dd className={`mt-1 font-semibold tabular-nums ${left ? "text-warn" : ""}`}>{left === null ? "Price to set" : rupees(left)}</dd>
                </div>
              </dl>
              {payments.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Received</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="hidden sm:table-cell">By</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{when(payment.receivedAt)}</TableCell>
                        <TableCell>
                          {methodLabel[payment.method]}
                          {payment.reference && <span className="block text-xs text-muted-foreground">{payment.reference}</span>}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">{payment.createdBy ? (people.get(payment.createdBy) ?? "staff") : ""}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{rupees(payment.amountPaise)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {takesMoney && may("bookings.modify") && <PaymentForm bookingId={booking.id} suggested={left ? String(left / 100) : ""} />}
            </CardContent>
          </Card>

          <Timeline loaded={loaded} />
        </div>

        {may("bookings.modify") && (
          <aside className="grid content-start gap-4 lg:col-start-2 lg:row-start-2 print:hidden">
            <Card>
              <CardContent>
                <NoteForm bookingId={booking.id} />
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </>
  );
}

const eventIcon = { created: Sparkles, status: CalendarCheck, payment: IndianRupee, price_override: PencilLine, unit_assigned: ArrowRightLeft, note: MessageSquareText } as const;

/** Everything that happened to the booking, newest first. */
function Timeline({ loaded }: { loaded: LoadedBooking }) {
  const { events, people } = loaded;
  const by = (userId: string | null) => (userId ? (people.get(userId) ?? "staff") : "the system");
  const say = (event: LoadedBooking["events"][number]) => {
    const data = (event.data ?? {}) as Record<string, unknown>;
    switch (event.type) {
      case "created":
        return `Booked (${sourceLabel[(data.source as keyof typeof sourceLabel) ?? "admin"] ?? "admin"})`;
      case "status":
        return `${event.fromStatus ? statusLabel[event.fromStatus] : "New"} to ${event.toStatus ? statusLabel[event.toStatus] : ""}`;
      case "payment":
        return `Payment of ${rupees(Number(data.amountPaise))} by ${methodLabel[data.method as keyof typeof methodLabel] ?? "other"}${data.reference ? ` (${data.reference})` : ""}`;
      case "price_override":
        return `Price set to ${rupees(Number(data.toPaise))}, from ${price(data.fromPaise as number | null)}`;
      case "unit_assigned":
        return data.from ? `Moved from ${data.from} to ${data.to}` : `Given ${data.to}`;
      case "note":
        return "Note";
      default:
        return event.type;
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>Every change to this booking, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative grid gap-5 border-l pl-6">
          {events.map((event) => {
            const Icon = eventIcon[event.type as keyof typeof eventIcon] ?? CircleAlert;
            return (
              <li key={event.id} className="relative">
                <span className="absolute top-0 -left-[2.3rem] flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <p className="text-sm font-medium">{say(event)}</p>
                {event.note && <p className="text-sm">{event.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {when(event.at)} · {by(event.userId)}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

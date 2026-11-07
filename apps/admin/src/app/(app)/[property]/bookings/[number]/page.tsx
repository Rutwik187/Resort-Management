import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft, CalendarCheck, CalendarRange, CircleAlert, Clock, IndianRupee, Link2, Mail, MessageCircle, MessageSquareText, Phone, PencilLine, Sparkles, Undo2 } from "lucide-react";
import { can } from "@repo/auth";
import { getDb } from "@repo/db";
import { freeUnits, todayInIndia, type Quote } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { PersonAvatar } from "@/components/person-avatar";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadBooking, type LoadedBooking } from "@/lib/bookings";
import { balance, clock, longDate, methodLabel, partyLabel, plural, price, rupees, shortDate, sourceLabel, statusLabel, when } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { CancelForm, MoveButton, NoShowButton, NoteForm, PaymentForm, PriceForm, PrintButton, RoomForm } from "./forms";
import { InvoicesCard, loadMoney, OnlinePaymentRows, RefundsCard, WaitingLinks } from "./money";
import { PaymentLinkForm } from "./money-forms";

export async function generateMetadata({ params }: PageProps<"/[property]/bookings/[number]">) {
  return { title: (await params).number.toUpperCase() };
}

const open = ["pending_payment", "part_paid", "confirmed", "checked_in"];

/** One booking: guest, stay, prices, payments, actions and timeline (ADM-04, ADM-05). */
export default async function BookingPage({ params, searchParams }: PageProps<"/[property]/bookings/[number]">) {
  const staff = await requireStaffPage();
  const { property: code, number } = await params;
  const property = await propertyFromCode(code, staff);
  if (!can(staff, "bookings.view", property.id)) return <NoAccess what="bookings" />;
  const loaded = await loadBooking(property.id, number);
  if (!loaded) notFound();
  const { booking, guest, items, payments, hold, bands, people } = loaded;
  const money = await loadMoney(booking);

  const may = (permission: Parameters<typeof can>[1]) => can(staff, permission, property.id);
  const today = todayInIndia();
  // After a change, what the guest paid over the new price, to give back.
  const refundParam = (await searchParams).refund;
  const refund = Math.max(0, Number(Array.isArray(refundParam) ? refundParam[0] : refundParam) || 0);
  const due = booking.checkIn ?? booking.visitDate;
  const arrived = due !== null && today >= due;
  // A closed booking owes nothing, whatever its price was.
  const closed = ["cancelled", "refunded", "expired", "no_show"].includes(booking.status);
  const left = closed ? 0 : balance(booking);
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

  const party = items.reduce(
    (sum, { item }) => ({ adults: sum.adults + item.party.adults, children: sum.children + Object.values(item.party.children).reduce((a, b) => a + (b ?? 0), 0) }),
    { adults: 0, children: 0 },
  );
  const guestsLabel = [plural(party.adults, "adult"), party.children ? plural(party.children, "child", "children") : ""].filter(Boolean).join(", ");
  const paidShare = booking.totalPaise ? Math.min(1, booking.paidPaise / booking.totalPaise) : 0;
  const facts: { label: string; value: string; note?: string }[] =
    booking.checkIn && booking.checkOut
      ? [
          { label: "Check-in", value: shortDate(booking.checkIn), note: booking.checkIn === today ? "Today" : undefined },
          { label: "Check-out", value: shortDate(booking.checkOut), note: booking.checkOut === today ? "Today" : undefined },
          { label: "Stay", value: plural(nights, "night"), note: guestsLabel },
        ]
      : [
          { label: "Visit", value: booking.visitDate ? shortDate(booking.visitDate) : "", note: booking.visitDate === today ? "Today" : undefined },
          { label: "Guests", value: guestsLabel },
        ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <PersonAvatar name={guest.name} className="size-12 rounded-full text-base max-sm:hidden" />
          <div className="min-w-0 space-y-1.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{guest.name}</h1>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{booking.number}</span>
              <StatusBadge status={booking.status} />
              <span>
                {sourceLabel[booking.source]} booking, made {when(booking.createdAt)}
                {booking.createdBy ? ` by ${people.get(booking.createdBy) ?? "staff"}` : ""}.
              </span>
              <span className="hidden print:inline">{property.name}.</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <PrintButton />
        </div>
      </div>

      <Card className="gap-0 py-0 shadow-xs">
        <dl className={`grid divide-y sm:divide-y-0 sm:divide-x ${facts.length === 3 ? "sm:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.6fr)]" : "sm:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,1.6fr)]"}`}>
          {facts.map((fact) => (
            <div key={fact.label} className="px-5 py-4">
              <dt className="text-xs font-medium text-muted-foreground">{fact.label}</dt>
              <dd className="mt-1 text-lg font-semibold tracking-tight">{fact.value}</dd>
              {fact.note && <dd className="text-xs text-muted-foreground">{fact.note}</dd>}
            </div>
          ))}
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Total with GST</dt>
                <dd className="mt-1 text-lg font-semibold tracking-tight tabular-nums">{price(booking.totalPaise)}</dd>
                {booking.subtotalPaise !== null && booking.taxPaise !== null && booking.taxPaise > 0 && (
                  <dd className="text-xs text-muted-foreground tabular-nums">
                    {rupees(booking.subtotalPaise)} + {rupees(booking.taxPaise)} GST
                  </dd>
                )}
              </div>
              <div className="text-right">
                <dt className="text-xs font-medium text-muted-foreground">To pay</dt>
                <dd className={`mt-1 text-lg font-semibold tracking-tight tabular-nums ${left ? "text-warn" : ""}`}>{closed ? "Nothing" : left === null ? "Price to set" : left === 0 ? "Paid" : rupees(left)}</dd>
              </div>
            </div>
            <dd
              role="meter"
              aria-label={`${rupees(booking.paidPaise)} paid`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(paidShare * 100)}
              className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-chart/15"
            >
              <div className="h-full rounded-full bg-chart" style={{ width: `${paidShare * 100}%` }} />
            </dd>
            <dd className="mt-1.5 text-xs text-muted-foreground tabular-nums">
              {rupees(booking.paidPaise)} paid{booking.refundedPaise > 0 ? `, ${rupees(booking.refundedPaise)} refunded` : ""}
            </dd>
          </div>
        </dl>
      </Card>

      {refund > 0 && (
        <Alert className="border-good/30 bg-good/5 text-good print:hidden">
          <IndianRupee />
          <AlertTitle>Changed. Refund {rupees(refund)} to the guest</AlertTitle>
          <AlertDescription className="text-good/90">They have paid more than the new price. Use Refund, under Refunds, to send it back.</AlertDescription>
        </Alert>
      )}

      {booking.status === "pending_payment" && hold && (
        <Alert className="border-warn/30 bg-warn/5 text-warn print:hidden">
          <Clock />
          <AlertTitle>{hold.expiresAt > new Date() ? `Held until ${clock(hold.expiresAt)}` : `The hold ran out at ${clock(hold.expiresAt)}`}</AlertTitle>
          <AlertDescription className="text-warn/90">
            {hold.expiresAt > new Date() ? (booking.source === "website" ? "The guest is paying on the website. The booking confirms itself when they do." : "Record a payment to keep the rooms or seats.") : "The rooms or seats are back on sale. A payment now takes them again if they are still free."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr]">
        <aside className="grid content-start gap-4 lg:col-start-2 lg:row-start-1">
          <Card>
            <CardHeader>
              <CardTitle>Guest</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {guest.phone && (
                <a href={`tel:+${guest.phone}`} className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/60">
                  <Phone className="size-4 text-muted-foreground" />
                  <span className="tabular-nums">+{guest.phone}</span>
                </a>
              )}
              {guest.phone && (
                <a href={`https://wa.me/${guest.phone}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/60 print:hidden">
                  <MessageCircle className="size-4 text-muted-foreground" />
                  WhatsApp
                </a>
              )}
              {guest.email && (
                <a href={`mailto:${guest.email}`} className="flex items-center gap-3 rounded-lg border px-3 py-2 break-all transition-colors hover:bg-muted/60">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  {guest.email}
                </a>
              )}
              {!guest.phone && !guest.email && <p className="text-muted-foreground">No phone or email on this booking.</p>}
              <Link href={`/${property.code.toLowerCase()}/guests/${guest.id}`} className="mt-1 text-sm font-medium text-primary hover:underline print:hidden">
                Their other bookings and notes
              </Link>
              {(guest.companyName || guest.companyGstin) && (
                <>
                  <Separator className="my-1" />
                  <p className="font-medium">{guest.companyName}</p>
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
                {may("bookings.modify") && booking.checkIn && ["pending_payment", "part_paid", "confirmed", "checked_in"].includes(booking.status) && (
                  <Button variant="outline" asChild className="w-full">
                    <Link href={`/${property.code.toLowerCase()}/bookings/${booking.number.toLowerCase()}/change`}>
                      <CalendarRange />
                      Change dates or rooms
                    </Link>
                  </Button>
                )}
                {may("prices.manage") && booking.status !== "checked_out" && <PriceForm bookingId={booking.id} current={booking.subtotalPaise === null ? "" : String(booking.subtotalPaise / 100)} />}
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
                {booking.checkIn && booking.checkOut ? `${longDate(booking.checkIn)} to ${longDate(booking.checkOut)}, ${plural(nights, "night")}` : booking.visitDate ? longDate(booking.visitDate) : ""}
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
              <CardTitle>Payments</CardTitle>
              {quote?.totalPaise !== undefined && booking.totalPaise !== quote?.totalPaise && <CardDescription>The rates gave {price(quote?.totalPaise)}; staff set this price (see the timeline).</CardDescription>}
              {takesMoney && may("bookings.modify") && money.onlinePayments && left !== null && left > 0 && (
                <CardAction className="print:hidden">
                  <PaymentLinkForm bookingId={booking.id} balance={String(left / 100)} />
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="grid gap-4">
              {payments.length === 0 && !money.online.some((p) => p.status === "paid") && <p className="text-sm text-muted-foreground">No payments yet.</p>}
              <WaitingLinks money={money} />
              {(payments.length > 0 || money.online.some((p) => p.status === "paid")) && (
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
                    <OnlinePaymentRows money={money} />
                  </TableBody>
                </Table>
              )}
              {takesMoney && may("bookings.modify") && <PaymentForm bookingId={booking.id} suggested={left ? String(left / 100) : ""} />}
            </CardContent>
          </Card>

          <RefundsCard
            booking={booking}
            money={money}
            may={{
              ask: may("refunds.request") || may("refunds.initiate") || may("refunds.approve"),
              approve: may("refunds.approve"),
              retry: may("refunds.initiate") || may("refunds.approve"),
            }}
            needsApproval={!may("refunds.approve")}
          />

          <InvoicesCard code={property.code} money={money} booking={booking} />

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

const eventIcon = {
  created: Sparkles,
  status: CalendarCheck,
  payment: IndianRupee,
  price_override: PencilLine,
  unit_assigned: ArrowRightLeft,
  note: MessageSquareText,
  changed: CalendarRange,
  payment_link: Link2,
  refund_requested: Undo2,
  refund_approved: Undo2,
  refund_rejected: Undo2,
  refund: Undo2,
} as const;

/** "razorpay_upi" is a Razorpay payment by UPI. */
const paidBy = (method: string) => (method.startsWith("razorpay") ? `Razorpay${method.length > 9 ? ` (${method.slice(9)})` : ""}` : (methodLabel[method as keyof typeof methodLabel] ?? "other"));

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
        return `Payment of ${rupees(Number(data.amountPaise))} by ${paidBy(String(data.method ?? "other"))}${data.reference ? ` (${data.reference})` : ""}`;
      case "price_override":
        return data.toSubtotalPaise !== undefined
          ? `Price set to ${price(data.toSubtotalPaise as number | null)} before GST, ${price(data.toPaise as number | null)} with it`
          : `Price set to ${rupees(Number(data.toPaise))}, from ${price(data.fromPaise as number | null)}`;
      case "payment_link":
        return `Payment link for ${rupees(Number(data.amountPaise))} sent`;
      case "refund_requested":
        return `Refund of ${rupees(Number(data.amountPaise))} asked for${data.approved ? " and started" : ""}`;
      case "refund_approved":
        return `Refund of ${rupees(Number(data.amountPaise))} approved`;
      case "refund_rejected":
        return `Refund of ${rupees(Number(data.amountPaise))} rejected`;
      case "refund":
        return `${rupees(Number(data.amountPaise))} refunded${data.reference ? ` (${data.reference})` : ""}`;
      case "unit_assigned":
        return data.from ? `Moved from ${data.from} to ${data.to}` : `Given ${data.to}`;
      case "note":
        return "Note";
      case "changed": {
        const from = data.from as { checkIn?: string; checkOut?: string; totalPaise?: number | null } | undefined;
        const to = data.to as { checkIn?: string; checkOut?: string; totalPaise?: number | null } | undefined;
        return `Changed from ${from?.checkIn ? shortDate(from.checkIn) : "?"} – ${from?.checkOut ? shortDate(from.checkOut) : "?"} to ${to?.checkIn ? shortDate(to.checkIn) : "?"} – ${to?.checkOut ? shortDate(to.checkOut) : "?"}, ${price(to?.totalPaise ?? null)}`;
      }
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

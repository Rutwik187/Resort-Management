import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { BedDouble, CalendarSearch, CircleAlert, Inbox, Search, Ticket } from "lucide-react";
import { can } from "@repo/auth";
import { ageBands, getDb, leads, roomTypes } from "@repo/db";
import { addDays, isDate, searchStays, seatsLeft, todayInIndia } from "@repo/engine";
import { DateField, DateRangeField } from "@/components/date-field";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { longDate, plural } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { z } from "zod";
import { NewBookingForm, Step, type Option } from "./booking-form";

export const metadata = { title: "New booking" };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** An offline booking for a walk-in, phone, WhatsApp, travel agent or corporate guest (ADM-06). */
export default async function NewBookingPage({ params, searchParams }: PageProps<"/[property]/bookings/new">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "bookings.create", property.id)) return <NoAccess what="new bookings" />;

  const query = await searchParams;
  // From a lead's "Make a booking": its guest fills in the form, and the booking marks it booked.
  const leadId = z.uuid().safeParse(one(query.lead)).success ? one(query.lead)! : undefined;
  const [lead] = leadId && can(staff, "leads.view", property.id)
    ? await getDb()
        .select({ id: leads.id, name: leads.name, phone: leads.phone, email: leads.email, message: leads.message })
        .from(leads)
        .where(and(eq(leads.id, leadId), eq(leads.propertyId, property.id)))
    : [];
  const kind = one(query.kind) === "day" ? "day" : "stay";
  const today = todayInIndia();
  const checkIn = one(query.checkIn) || today;
  const checkOut = one(query.checkOut) || addDays(isDate(checkIn) ? checkIn : today, 1);
  const day = one(query.day) || today;
  const asked = kind === "stay" ? one(query.checkIn) !== undefined : one(query.day) !== undefined;

  let problem: string | null = null;
  if (asked && kind === "stay") {
    if (!isDate(one(query.checkIn)) || !isDate(one(query.checkOut))) problem = "Choose both dates: check-in, then check-out.";
    else if (checkIn < today) problem = "Check-in can't be in the past.";
    else if (checkOut <= checkIn) problem = "Check-out must be after check-in.";
  }
  if (asked && kind === "day") {
    if (!isDate(day)) problem = "Choose the date.";
    else if (day < today) problem = "The date can't be in the past.";
  }

  const db = getDb();
  let options: Option[] = [];
  if (asked && !problem) {
    if (kind === "stay") {
      const stays = await searchStays(db, property.id, checkIn, checkOut);
      const limits = stays.length
        ? await db
            .select({ id: roomTypes.id, maxAdults: roomTypes.maxAdults, maxGuests: roomTypes.maxGuests, extraBedAllowed: roomTypes.extraBedAllowed })
            .from(roomTypes)
            .where(inArray(roomTypes.id, stays.map((s) => s.roomTypeId)))
        : [];
      options = stays.map((stay) => {
        const limit = limits.find((l) => l.id === stay.roomTypeId)!;
        return { id: stay.roomTypeId, name: stay.name, available: stay.freeUnits, closedReason: stay.closedReason, maxAdults: limit.maxAdults, maxGuests: limit.maxGuests, extraBedAllowed: limit.extraBedAllowed };
      });
    } else {
      const seats = await seatsLeft(db, property.id, day);
      options = seats.map((seat) => ({
        id: seat.slotId,
        name: `${seat.offeringName}, ${seat.slotLabel}`,
        available: seat.left,
        closedReason: seat.closedReason,
        maxAdults: Math.max(1, seat.left),
        maxGuests: seat.left,
        extraBedAllowed: false,
      }));
    }
  }
  const bands = await db.select({ code: ageBands.code, label: ageBands.label }).from(ageBands).where(eq(ageBands.propertyId, property.id)).orderBy(asc(ageBands.sortOrder));
  const base = `/${property.code.toLowerCase()}/bookings/new`;
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);

  return (
    <>
      <PageHeader title="New booking" description="For walk-in, phone, WhatsApp, travel agent and corporate guests. It books through the same engine as the website, so rooms and seats stay right everywhere." />

      {lead && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3 text-sm">
          <Inbox className="size-4 text-primary" />
          Booking for the lead <span className="font-medium">{lead.name}</span>. Their details fill in below, and the lead is marked booked when you create the booking.
          <Link href={`/${property.code.toLowerCase()}/leads/${lead.id}`} className="font-medium text-primary hover:underline">
            Back to the lead
          </Link>
        </p>
      )}

      <Card className="shadow-xs">
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <Step n={1} />
            <div>
              <p className="font-semibold leading-none">What and when</p>
              <p className="mt-1 text-sm text-muted-foreground">{kind === "stay" ? "Pick the check-in and check-out dates." : "Pick the day of the visit."}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <nav aria-label="Kind of booking" className="inline-flex w-fit shrink-0 gap-1 rounded-lg bg-muted p-1">
              <Link
                href={lead ? `${base}?lead=${lead.id}` : base}
                aria-current={kind === "stay" ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4 ${kind === "stay" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <BedDouble />A stay
              </Link>
              <Link
                href={`${base}?kind=day${lead ? `&lead=${lead.id}` : ""}`}
                aria-current={kind === "day" ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4 ${kind === "day" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Ticket />A day visit
              </Link>
            </nav>
            <form className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {lead && <input type="hidden" name="lead" value={lead.id} />}
              {kind === "stay" ? (
                <div className="w-full sm:max-w-md">
                  <DateRangeField id="stay-dates" names={["checkIn", "checkOut"]} defaultValue={[checkIn, checkOut]} min={today} />
                </div>
              ) : (
                <div className="w-full sm:max-w-xs">
                  <input type="hidden" name="kind" value="day" />
                  <DateField id="visit-day" name="day" defaultValue={day} min={today} />
                </div>
              )}
              <Button type="submit" className="shrink-0">
                <Search />
                {kind === "stay" ? "Find rooms" : "Find tickets"}
              </Button>
            </form>
            {asked && !problem && (
              <p className="text-sm text-muted-foreground lg:ml-auto" role="status">
                {kind === "stay" ? `${longDate(checkIn)} to ${longDate(checkOut)}, ${plural(nights, "night")}.` : `${longDate(day)}.`}
              </p>
            )}
          </div>
          {problem && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{problem}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {!asked && (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">{kind === "stay" ? <CalendarSearch /> : <Ticket />}</EmptyMedia>
            <EmptyTitle>{kind === "stay" ? "Choose the dates to see free rooms" : "Choose the day to see tickets"}</EmptyTitle>
            <EmptyDescription>Then add {kind === "stay" ? "rooms" : "tickets"}, say who is coming, check the price, and take any payment. The booking gets its number at once.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {asked && !problem && (
        <NewBookingForm
          key={kind === "stay" ? `${checkIn}-${checkOut}` : day}
          propertyId={property.id}
          kind={kind}
          dates={kind === "stay" ? { checkIn, checkOut } : { day }}
          options={options}
          bands={bands}
          canOverride={can(staff, "prices.manage", property.id)}
          prefill={lead ? { leadId: lead.id, name: lead.name, phone: lead.phone ? (lead.phone.startsWith("91") && lead.phone.length === 12 ? lead.phone.slice(2) : lead.phone) : "", email: lead.email ?? "" } : undefined}
          canTakePayment={can(staff, "bookings.modify", property.id)}
        />
      )}
    </>
  );
}

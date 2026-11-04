import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { BedDouble, CircleAlert, Search, Ticket } from "lucide-react";
import { can } from "@repo/auth";
import { ageBands, getDb, roomTypes } from "@repo/db";
import { addDays, isDate, searchStays, seatsLeft, todayInIndia } from "@repo/engine";
import { DateField, DateRangeField } from "@/components/date-field";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { longDate, plural } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { NewBookingForm, type Option } from "./booking-form";

export const metadata = { title: "New booking" };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** An offline booking for a walk-in, phone, WhatsApp, travel agent or corporate guest (ADM-06). */
export default async function NewBookingPage({ params, searchParams }: PageProps<"/[property]/bookings/new">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "bookings.create", property.id)) return <NoAccess what="new bookings" />;

  const query = await searchParams;
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

      <Card>
        <CardContent className="grid gap-5">
          <nav aria-label="Kind of booking" className="inline-flex w-fit gap-1 rounded-lg bg-muted p-1">
            <Button variant={kind === "stay" ? "default" : "ghost"} size="sm" asChild>
              <Link href={base} aria-current={kind === "stay" ? "page" : undefined}>
                <BedDouble />A stay
              </Link>
            </Button>
            <Button variant={kind === "day" ? "default" : "ghost"} size="sm" asChild>
              <Link href={`${base}?kind=day`} aria-current={kind === "day" ? "page" : undefined}>
                <Ticket />A day visit
              </Link>
            </Button>
          </nav>
          <form className="flex flex-wrap items-end gap-3">
            {kind === "stay" ? (
              <Field className="w-full max-w-md">
                <FieldLabel htmlFor="stay-dates">Check-in and check-out</FieldLabel>
                <DateRangeField id="stay-dates" names={["checkIn", "checkOut"]} defaultValue={[checkIn, checkOut]} min={today} />
              </Field>
            ) : (
              <Field className="w-full max-w-xs">
                <input type="hidden" name="kind" value="day" />
                <FieldLabel htmlFor="visit-day">Date</FieldLabel>
                <DateField id="visit-day" name="day" defaultValue={day} min={today} />
              </Field>
            )}
            <Button type="submit">
              <Search />
              {kind === "stay" ? "Find rooms" : "Find tickets"}
            </Button>
          </form>
          {problem && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{problem}</AlertDescription>
            </Alert>
          )}
          {asked && !problem && (
            <p className="text-sm text-muted-foreground" role="status">
              {kind === "stay" ? `${longDate(checkIn)} to ${longDate(checkOut)}, ${plural(nights, "night")}.` : `${longDate(day)}.`}
            </p>
          )}
        </CardContent>
      </Card>

      {asked && !problem && (
        <NewBookingForm
          key={kind === "stay" ? `${checkIn}-${checkOut}` : day}
          propertyId={property.id}
          kind={kind}
          dates={kind === "stay" ? { checkIn, checkOut } : { day }}
          options={options}
          bands={bands}
          canOverride={can(staff, "prices.manage", property.id)}
          canTakePayment={can(staff, "bookings.modify", property.id)}
        />
      )}
    </>
  );
}

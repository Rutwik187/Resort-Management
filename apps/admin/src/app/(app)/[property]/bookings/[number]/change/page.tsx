import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { can } from "@repo/auth";
import { ageBands, getDb, roomTypes } from "@repo/db";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { loadBooking } from "@/lib/bookings";
import { longDate } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { ChangeStayForm } from "./change-form";

export const metadata = { title: "Change a booking" };

const changeable = ["pending_payment", "part_paid", "confirmed", "checked_in"];

/** Change a stay's dates, rooms or guests (BK-06). */
export default async function ChangeBookingPage({ params }: PageProps<"/[property]/bookings/[number]/change">) {
  const staff = await requireStaffPage();
  const { property: code, number } = await params;
  const property = await propertyFromCode(code, staff);
  if (!can(staff, "bookings.modify", property.id)) return <NoAccess what="changing bookings" />;
  const loaded = await loadBooking(property.id, number);
  if (!loaded) notFound();
  const { booking, guest, items } = loaded;
  const back = `/${property.code.toLowerCase()}/bookings/${booking.number.toLowerCase()}`;

  if (!booking.checkIn || !booking.checkOut || !changeable.includes(booking.status)) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlert />
          </EmptyMedia>
          <EmptyTitle>This booking can&apos;t change here</EmptyTitle>
          <EmptyDescription>
            {booking.checkIn ? "Only a stay that is waiting for payment, paid or checked in can change." : "A day visit's date can't change yet: cancel it and book the new date."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href={back}>
              <ArrowLeft />
              Back to the booking
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const db = getDb();
  const [types, bands] = await Promise.all([
    db
      .select({ id: roomTypes.id, name: roomTypes.name, maxAdults: roomTypes.maxAdults, maxGuests: roomTypes.maxGuests, extraBedAllowed: roomTypes.extraBedAllowed })
      .from(roomTypes)
      .where(and(eq(roomTypes.propertyId, property.id), eq(roomTypes.status, "active")))
      .orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name)),
    db.select({ code: ageBands.code, label: ageBands.label }).from(ageBands).where(eq(ageBands.propertyId, property.id)).orderBy(asc(ageBands.sortOrder)),
  ]);
  const stays = items.filter(({ item }) => item.kind === "stay" && item.roomTypeId);
  const hasAddons = items.some(({ item }) => item.kind === "addon");

  return (
    <>
      <PageHeader
        title={`Change ${booking.number}`}
        description={`${guest.name}, ${longDate(booking.checkIn)} to ${longDate(booking.checkOut)}. The new nights must be free; the old ones go back on sale when you save.${hasAddons ? " Add-ons stay at the price agreed; per-night ones follow the new nights." : ""}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={back}>
              <ArrowLeft />
              Back to the booking
            </Link>
          </Button>
        }
      />
      <ChangeStayForm
        bookingId={booking.id}
        checkIn={booking.checkIn}
        checkOut={booking.checkOut}
        lines={stays.map(({ item }) => ({ roomTypeId: item.roomTypeId!, adults: item.party.adults, children: item.party.children, extraBeds: item.extraBeds }))}
        roomTypes={types}
        bands={bands}
        canKeepPrice={can(staff, "prices.manage", property.id)}
        checkedIn={booking.status === "checked_in"}
      />
    </>
  );
}

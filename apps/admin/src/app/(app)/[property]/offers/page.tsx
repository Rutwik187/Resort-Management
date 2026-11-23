import { and, asc, eq, gte, ne, sql } from "drizzle-orm";
import { BadgePercent, CalendarHeart, CalendarRange, Clock, Globe, Ticket, Users } from "lucide-react";
import { can } from "@repo/auth";
import { bookings, getDb, offerDays, offerings, offers, offerUses, roomTypes } from "@repo/db";
import { offerLabel, todayInIndia } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { plural, shortDate } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { DeleteOfferButton, OfferDayDialog, OfferDialog, offerKindLabel, OfferSwitch, RemoveOfferDayButton, type OfferValues } from "./forms";

export const metadata = { title: "Offers" };

const scopeLabel = { stay: "Stays", day: "Day visits", any: "Stays and day visits" } as const;

/**
 * Offers and coupons (docs/implementation-plan.md, section 9: Offers): what
 * the website shows, and what the team applies to a booking at the desk.
 */
export default async function OffersPage({ params }: PageProps<"/[property]/offers">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "prices.view", property.id)) return <NoAccess what="offers" />;
  const manage = can(staff, "prices.manage", property.id);
  const db = getDb();
  const list = await db.select().from(offers).where(eq(offers.propertyId, property.id)).orderBy(asc(offers.sortOrder), asc(offers.title));
  const today = todayInIndia();
  const rooms = await db.select({ id: roomTypes.id, name: roomTypes.name }).from(roomTypes).where(and(eq(roomTypes.propertyId, property.id), eq(roomTypes.status, "active"))).orderBy(asc(roomTypes.sortOrder));
  const passes = await db.select({ id: offerings.id, name: offerings.name }).from(offerings).where(and(eq(offerings.propertyId, property.id), eq(offerings.active, true))).orderBy(asc(offerings.sortOrder));
  const choices = { rooms, passes };
  // Uses that count: every booking except those that expired unpaid (OFR-05).
  const uses = await db
    .select({ offerId: offerUses.offerId, n: sql<number>`count(*)::int`, paise: sql<number>`coalesce(sum(${offerUses.discountPaise}), 0)`.mapWith(Number) })
    .from(offerUses)
    .innerJoin(bookings, eq(bookings.id, offerUses.bookingId))
    .where(and(eq(offerUses.propertyId, property.id), ne(bookings.status, "expired")))
    .groupBy(offerUses.offerId);
  const usesOf = (id: string) => uses.find((u) => u.offerId === id);
  const days = await db
    .select({ id: offerDays.id, day: offerDays.day, quantity: offerDays.quantity, title: offers.title })
    .from(offerDays)
    .innerJoin(offers, eq(offers.id, offerDays.offerId))
    .where(and(eq(offerDays.propertyId, property.id), gte(offerDays.day, today)))
    .orderBy(asc(offerDays.day))
    .limit(60);
  const dayOffers = list.filter((o) => o.active && (o.discountKind !== "none" || o.freeNights)).map((o) => ({ id: o.id, title: o.title }));
  const values = (offer: (typeof list)[number]): OfferValues => ({
    id: offer.id,
    title: offer.title,
    details: offer.details,
    code: offer.code,
    discountKind: offer.discountKind,
    discountValue: offer.discountValue,
    appliesTo: offer.appliesTo,
    startsOn: offer.startsOn,
    endsOn: offer.endsOn,
    minNights: offer.minNights,
    onWebsite: offer.onWebsite,
    active: offer.active,
    kind: offer.kind,
    bookFrom: offer.bookFrom,
    bookTo: offer.bookTo,
    minDaysAhead: offer.minDaysAhead,
    maxDaysAhead: offer.maxDaysAhead,
    weekdays: offer.weekdays,
    roomTypeIds: offer.roomTypeIds,
    offeringIds: offer.offeringIds,
    freeNights: offer.freeNights,
    maxUses: offer.maxUses,
    maxUsesPerGuest: offer.maxUsesPerGuest,
    minAmountPaise: offer.minAmountPaise,
    showCode: offer.showCode,
  });
  const ended = (offer: (typeof list)[number]) => offer.endsOn !== null && offer.endsOn < today;
  const live = list.filter((o) => o.active && !ended(o));

  return (
    <>
      <PageHeader
        title="Offers and coupons"
        description="Deals the website shows, and coupons with a code the team gives out. Choose one when you make a booking: each booking takes one offer."
        actions={manage && <OfferDialog propertyId={property.id} choices={choices} />}
      />

      <Card className="gap-3 shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarHeart className="size-4 text-primary" />
            Offer of the Day
          </CardTitle>
          <CardDescription>One featured offer a day, scheduled ahead. The website shows it with a countdown to midnight.</CardDescription>
          {manage && (
            <CardAction>
              <OfferDayDialog propertyId={property.id} offers={dayOffers} today={today} />
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {days.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled.{dayOffers.length === 0 ? " Add an offer that takes something off first." : ""}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {days.map((day) => (
                <li key={day.id} className={`flex items-center gap-1 rounded-md border py-1 pl-3 pr-1 text-sm ${day.day === today ? "border-primary/40 bg-primary/5" : ""}`}>
                  <span className="font-medium">{day.day === today ? "Today" : shortDate(day.day)}</span>
                  <span className="text-muted-foreground">· {day.title}</span>
                  {day.quantity !== null && <span className="text-muted-foreground">· {plural(day.quantity, "booking")}</span>}
                  {manage && <RemoveOfferDayButton dayId={day.id} label={shortDate(day.day)} />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BadgePercent />
            </EmptyMedia>
            <EmptyTitle>No offers yet</EmptyTitle>
            <EmptyDescription>Add one for the monsoon, for honeymooners or for groups, or a coupon for a travel agent.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {plural(live.length, "offer")} on now, {live.filter((o) => o.onWebsite).length} of them on the website.
          </p>
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {list.map((offer) => {
              const off = !offer.active || ended(offer);
              return (
                <Card key={offer.id} className={`gap-4 shadow-xs ${off ? "bg-muted/30" : ""}`}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {offer.title}
                      {!offer.active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Off
                        </Badge>
                      )}
                      {offer.active && ended(offer) && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Ended
                        </Badge>
                      )}
                    </CardTitle>
                    {offer.details && <CardDescription>{offer.details}</CardDescription>}
                    {manage && (
                      <CardAction className="flex items-center gap-1">
                        <OfferDialog propertyId={property.id} offer={values(offer)} choices={choices} />
                        <OfferSwitch offerId={offer.id} active={offer.active} />
                        <DeleteOfferButton offerId={offer.id} title={offer.title} />
                      </CardAction>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge className={offer.discountKind === "none" && !offer.freeNights ? "bg-secondary text-secondary-foreground hover:bg-secondary" : "bg-primary/10 text-primary hover:bg-primary/10"}>
                      <BadgePercent />
                      {offerLabel(offer)}
                    </Badge>
                    {offer.code && (
                      <Badge variant="outline" className="font-mono">
                        <Ticket />
                        {offer.code}
                      </Badge>
                    )}
                    <Badge variant="outline" className="font-normal">
                      {scopeLabel[offer.appliesTo]}
                      {offer.minNights ? `, ${plural(offer.minNights, "night")} or more` : ""}
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      <CalendarRange />
                      {offer.startsOn || offer.endsOn ? `${offer.startsOn ? shortDate(offer.startsOn) : "Now"} – ${offer.endsOn ? shortDate(offer.endsOn) : "no end"}` : "Any day"}
                    </Badge>
                    <Badge variant="outline" className={offer.onWebsite ? "border-primary/30 font-normal text-primary" : "font-normal text-muted-foreground"}>
                      <Globe />
                      {offer.onWebsite ? (offer.code ? (offer.showCode ? "On the website, with its code" : "On the website, without its code") : "On the website") : "Not on the website"}
                    </Badge>
                    {offer.kind !== "standard" && (
                      <Badge variant="outline" className="font-normal">
                        {offerKindLabel[offer.kind]}
                      </Badge>
                    )}
                    {(offer.bookFrom || offer.bookTo || offer.minDaysAhead || offer.maxDaysAhead !== null) && (
                      <Badge variant="outline" className="font-normal">
                        <Clock />
                        {[
                          offer.bookFrom || offer.bookTo ? `Book ${offer.bookFrom ? shortDate(offer.bookFrom) : "now"} – ${offer.bookTo ? shortDate(offer.bookTo) : "no end"}` : null,
                          offer.minDaysAhead ? `${offer.minDaysAhead}+ days ahead` : null,
                          offer.maxDaysAhead !== null ? `within ${plural(offer.maxDaysAhead, "day")}` : null,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Badge>
                    )}
                    {offer.weekdays?.length ? (
                      <Badge variant="outline" className="font-normal">
                        {offer.weekdays.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}
                      </Badge>
                    ) : null}
                    {offer.roomTypeIds.length + offer.offeringIds.length > 0 && (
                      <Badge variant="outline" className="font-normal">
                        {[...rooms, ...passes]
                          .filter((r) => offer.roomTypeIds.includes(r.id) || offer.offeringIds.includes(r.id))
                          .map((r) => r.name)
                          .join(", ") || "Rooms no longer on sale"}
                      </Badge>
                    )}
                    <Badge variant="outline" className="font-normal">
                      <Users />
                      Used {plural(usesOf(offer.id)?.n ?? 0, "time")}
                      {offer.maxUses ? ` of ${offer.maxUses}` : ""}
                      {offer.maxUsesPerGuest ? `, ${offer.maxUsesPerGuest} a guest` : ""}
                      {usesOf(offer.id)?.paise ? `, ₹${((usesOf(offer.id)!.paise) / 100).toLocaleString("en-IN")} off` : ""}
                    </Badge>
                    {offer.minAmountPaise ? (
                      <Badge variant="outline" className="font-normal">
                        From ₹{(offer.minAmountPaise / 100).toLocaleString("en-IN")}
                      </Badge>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

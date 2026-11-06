import { asc, eq } from "drizzle-orm";
import { BadgePercent, CalendarRange, Globe, Ticket } from "lucide-react";
import { can } from "@repo/auth";
import { getDb, offers } from "@repo/db";
import { offerLabel, todayInIndia } from "@repo/engine";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { plural, shortDate } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { DeleteOfferButton, OfferDialog, OfferSwitch } from "./forms";

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
  const list = await getDb().select().from(offers).where(eq(offers.propertyId, property.id)).orderBy(asc(offers.sortOrder), asc(offers.title));
  const today = todayInIndia();
  const ended = (offer: (typeof list)[number]) => offer.endsOn !== null && offer.endsOn < today;
  const live = list.filter((o) => o.active && !ended(o));

  return (
    <>
      <PageHeader
        title="Offers and coupons"
        description="Deals the website shows, and coupons with a code the team gives out. Choose one when you make a booking: each booking takes one offer."
        actions={manage && <OfferDialog propertyId={property.id} />}
      />

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
                        <OfferDialog
                          propertyId={property.id}
                          offer={{
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
                          }}
                        />
                        <OfferSwitch offerId={offer.id} active={offer.active} />
                        <DeleteOfferButton offerId={offer.id} title={offer.title} />
                      </CardAction>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge className={offer.discountKind === "none" ? "bg-secondary text-secondary-foreground hover:bg-secondary" : "bg-primary/10 text-primary hover:bg-primary/10"}>
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
                      {offer.onWebsite ? (offer.code ? "On the website, without its code" : "On the website") : "Not on the website"}
                    </Badge>
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

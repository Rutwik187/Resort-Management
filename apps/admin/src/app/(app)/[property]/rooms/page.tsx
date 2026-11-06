import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { ArrowDown, ArrowUp, BedDouble, CircleAlert, DoorOpen, Eye, EyeOff, Globe, IndianRupee, RotateCcw, Users, Wrench } from "lucide-react";
import { can } from "@repo/auth";
import { getDb, rates, roomTypes, units } from "@repo/db";
import { properties as sites } from "@repo/sites";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { mealLabel, plural, rupees } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { moveRoomType, setRoomTypeStatus, setUnitStatus } from "./actions";
import { AddUnitsForm, RoomTypeEditForm, RoomTypeForm } from "./forms";

export const metadata = { title: "Rooms and units" };

const dayLabel = { weekday: "Weekday nights", weekend: "Weekend nights", any: "Every night" } as const;
const unitDot = { active: "bg-good", maintenance: "bg-warn", inactive: "bg-muted-foreground/50" } as const;
const unitWord = { active: "In use", maintenance: "Maintenance", inactive: "Out of use" } as const;

/** A resort's room types and their units (RM-01, RM-02), with each type's base rates for reference. */
export default async function RoomsPage({ params }: PageProps<"/[property]/rooms">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  const manage = can(staff, "rooms.manage", property.id);
  const db = getDb();

  const types = await db.select().from(roomTypes).where(eq(roomTypes.propertyId, property.id)).orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));
  const ids = types.map((t) => t.id);
  const allUnits = ids.length ? await db.select().from(units).where(inArray(units.roomTypeId, ids)).orderBy(asc(units.sortOrder), asc(units.name)) : [];
  const baseRates = ids.length ? await db.select().from(rates).where(and(inArray(rates.roomTypeId, ids), isNull(rates.seasonId))) : [];

  const sections = sites.find((site) => site.code === property.code)?.staySections ?? [];
  const inUse = allUnits.filter((u) => u.status === "active").length;
  const resting = allUnits.filter((u) => u.status === "maintenance").length;
  const onSale = types.filter((t) => t.status === "active").length;
  const unrated = types.filter((t) => t.status === "active" && !baseRates.some((r) => r.roomTypeId === t.id)).length;

  return (
    <>
      <PageHeader
        title="Rooms and units"
        description="A room type is a kind of room, such as Garden Cottage; its units are the rooms themselves. Guests see the room types in this order."
        actions={manage && <RoomTypeForm propertyId={property.id} sections={sections} />}
      />

      {types.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Room types on sale" value={String(onSale)} note={types.length > onSale ? `${types.length - onSale} off sale` : "All on sale"} icon={BedDouble} />
          <StatCard label="Units in use" value={String(inUse)} note={`Of ${plural(allUnits.length, "unit")}`} icon={DoorOpen} />
          <StatCard label="In maintenance" value={String(resting)} note={resting ? "Not sold until back in use" : "None resting"} icon={Wrench} />
          <StatCard label="Without a rate" value={String(unrated)} note={unrated ? "Guests see “rate to confirm”" : "Every type has a rate"} icon={IndianRupee} />
        </div>
      )}

      {types.length === 0 && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BedDouble />
            </EmptyMedia>
            <EmptyTitle>No room types yet</EmptyTitle>
            <EmptyDescription>Add the first room type, such as Garden View Cottage, then its units.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="grid gap-4">
        {types.map((type, index) => {
          const own = allUnits.filter((u) => u.roomTypeId === type.id);
          const typeRates = baseRates.filter((r) => r.roomTypeId === type.id);
          const off = type.status === "inactive";
          return (
            <Card key={type.id} className={`gap-0 overflow-hidden py-0 shadow-xs ${off ? "bg-muted/30" : ""}`}>
              <CardHeader className="border-b py-4 [.border-b]:pb-4">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {type.name}
                  {off && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <EyeOff />
                      Off sale
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="capitalize">{type.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    {type.maxGuests === null
                      ? `${type.minGuests > 1 ? `${type.minGuests} or more guests` : "no guest limit set"}, base price covers ${type.baseOccupancy}`
                      : `${type.minGuests > 1 ? `${type.minGuests}–` : "up to "}${type.maxGuests} guests, base price covers ${type.baseOccupancy}`}
                  </span>
                  {type.extraBedAllowed && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Extra bed</span>
                    </>
                  )}
                  {type.bedType && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{type.bedType}</span>
                    </>
                  )}
                  {type.sizeSqft && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{type.sizeSqft} sq ft</span>
                    </>
                  )}
                  <Badge variant="outline" className="font-mono text-[0.68rem] font-normal">
                    {type.code}
                  </Badge>
                </CardDescription>
                {manage && (
                  <CardAction className="flex flex-wrap items-center gap-1">
                    <form action={moveRoomType.bind(null, type.id, "up")}>
                      <Button type="submit" variant="ghost" size="icon" className="size-8 text-muted-foreground" disabled={index === 0} aria-label={`Move ${type.name} up`} title="Move up">
                        <ArrowUp />
                      </Button>
                    </form>
                    <form action={moveRoomType.bind(null, type.id, "down")}>
                      <Button type="submit" variant="ghost" size="icon" className="size-8 text-muted-foreground" disabled={index === types.length - 1} aria-label={`Move ${type.name} down`} title="Move down">
                        <ArrowDown />
                      </Button>
                    </form>
                    <RoomTypeEditForm type={type} sections={sections} />
                    <form action={setRoomTypeStatus.bind(null, type.id, off ? "active" : "inactive")}>
                      <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                        {off ? <Eye /> : <EyeOff />}
                        {off ? "Put on sale" : "Take off sale"}
                      </Button>
                    </form>
                  </CardAction>
                )}
              </CardHeader>
              <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-6 py-2.5 text-sm ${type.onWebsite && !off ? "bg-primary/[0.03]" : "bg-muted/40"}`}>
                <Globe className={`size-4 shrink-0 ${type.onWebsite && !off ? "text-primary" : "text-muted-foreground"}`} />
                {type.onWebsite && !off ? (
                  <>
                    <span className="font-medium">On the website</span>
                    <span className="text-muted-foreground">· {sections.find((section) => section.id === type.webGroup)?.title ?? sections[0]?.title ?? "Stays"}</span>
                    {type.tagline ? <span className="min-w-0 truncate text-muted-foreground">· {type.tagline}</span> : <span className="text-warn">· No tagline yet</span>}
                  </>
                ) : (
                  <span className="text-muted-foreground">{off ? "Off sale, so not on the website" : "Not on the website. Staff can still book it here."}</span>
                )}
              </div>
              <CardContent className="grid gap-0 p-0 lg:grid-cols-[21rem_minmax(0,1fr)] lg:divide-x">
                <div className="grid content-start gap-2 p-5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Base rates</p>
                  {typeRates.length > 0 ? (
                    <dl className="grid gap-2">
                      {typeRates.map((rate) => (
                        <div key={rate.id} className="flex items-baseline justify-between gap-3">
                          <dt className="text-sm whitespace-nowrap text-muted-foreground">{dayLabel[rate.dayKind]}</dt>
                          <dd className="text-right text-sm font-medium tabular-nums">
                            {rupees(rate.basePaise)}
                            <span className="font-normal text-muted-foreground"> {rate.basis === "person" ? "an adult" : "a room"}</span>
                            <span className="block text-xs font-normal text-muted-foreground">{mealLabel[rate.mealPlan]}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="flex items-start gap-2 rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" />
                      No rate yet. Set one on the Prices page; until then guests see &ldquo;rate to confirm&rdquo;.
                    </p>
                  )}
                </div>
                <div className="grid content-start gap-3 border-t p-5 lg:border-t-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Units <span className="tabular-nums">({own.length})</span>
                    </p>
                    {manage && <AddUnitsForm roomTypeId={type.id} typeName={type.name} suggestion={type.category === "room" ? "Room" : type.category[0].toUpperCase() + type.category.slice(1)} />}
                  </div>
                  {own.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No units yet. Add the rooms themselves, such as Cottage 1 to Cottage 12.</p>
                  ) : (
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
                      {own.map((unit) => (
                        <li key={unit.id} className={`flex items-center gap-2 rounded-lg border py-1.5 pr-1 pl-3 text-sm ${unit.status === "active" ? "bg-background" : "bg-muted/50"}`}>
                          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${unitDot[unit.status]}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{unit.name}</span>
                            <span className="block text-xs text-muted-foreground">{unitWord[unit.status]}</span>
                          </span>
                          {manage && (
                            <form action={setUnitStatus.bind(null, unit.id, unit.status === "active" ? "maintenance" : "active")}>
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground"
                                aria-label={unit.status === "active" ? `Put ${unit.name} in maintenance` : `Put ${unit.name} back in use`}
                                title={unit.status === "active" ? "Maintenance" : "Back in use"}
                              >
                                {unit.status === "active" ? <Wrench /> : <RotateCcw />}
                              </Button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

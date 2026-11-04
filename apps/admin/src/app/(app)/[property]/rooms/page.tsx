import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { ArrowDown, ArrowUp, BedDouble, Eye, EyeOff, Users, Wrench } from "lucide-react";
import { can } from "@repo/auth";
import { getDb, rates, roomTypes, units } from "@repo/db";
import { PageHeader } from "@/components/page-header";
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
const unitLook = {
  active: "border-good/30 bg-good/10 text-good",
  maintenance: "border-warn/30 bg-warn/10 text-warn",
  inactive: "text-muted-foreground",
} as const;
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

  return (
    <>
      <PageHeader
        title="Rooms and units"
        description={`${plural(types.length, "room type")}, ${plural(allUnits.filter((u) => u.status === "active").length, "unit")} in use. A room type is a kind of room, such as Garden Cottage; its units are the rooms themselves. The order here is the order guests see.`}
        actions={manage && <RoomTypeForm propertyId={property.id} />}
      />

      {types.length === 0 && (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BedDouble />
            </EmptyMedia>
            <EmptyTitle>No room types yet</EmptyTitle>
            <EmptyDescription>Add the first room type, then its units.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="grid gap-4">
        {types.map((type, index) => {
          const own = allUnits.filter((u) => u.roomTypeId === type.id);
          const typeRates = baseRates.filter((r) => r.roomTypeId === type.id);
          return (
            <Card key={type.id} className={type.status === "inactive" ? "opacity-75" : undefined}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {type.name}
                  {type.status === "inactive" && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Off sale
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="secondary" className="capitalize">
                    {type.category}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[0.7rem]">
                    {type.code}
                  </Badge>
                  <Badge variant="outline">
                    <Users />
                    {type.minGuests > 1 ? `${type.minGuests}–` : "up to "}
                    {type.maxGuests} guests, base price covers {type.baseOccupancy}
                  </Badge>
                  {type.extraBedAllowed && <Badge variant="outline">Extra bed</Badge>}
                  {type.bedType && <Badge variant="outline">{type.bedType}</Badge>}
                  {type.sizeSqft && <Badge variant="outline">{type.sizeSqft} sq ft</Badge>}
                </CardDescription>
                {manage && (
                  <CardAction className="flex flex-wrap items-center gap-1.5">
                    <form action={moveRoomType.bind(null, type.id, "up")}>
                      <Button type="submit" variant="ghost" size="icon" className="size-8" disabled={index === 0} aria-label={`Move ${type.name} up`} title="Move up">
                        <ArrowUp />
                      </Button>
                    </form>
                    <form action={moveRoomType.bind(null, type.id, "down")}>
                      <Button type="submit" variant="ghost" size="icon" className="size-8" disabled={index === types.length - 1} aria-label={`Move ${type.name} down`} title="Move down">
                        <ArrowDown />
                      </Button>
                    </form>
                    <RoomTypeEditForm type={type} />
                    <form action={setRoomTypeStatus.bind(null, type.id, type.status === "active" ? "inactive" : "active")}>
                      <Button type="submit" variant="outline" size="sm">
                        {type.status === "active" ? <EyeOff /> : <Eye />}
                        {type.status === "active" ? "Take off sale" : "Put on sale"}
                      </Button>
                    </form>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="grid gap-5">
                {typeRates.length > 0 ? (
                  <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {typeRates.map((rate) => (
                      <div key={rate.id} className="rounded-lg border px-3 py-2">
                        <dt className="text-xs text-muted-foreground">{dayLabel[rate.dayKind]}</dt>
                        <dd className="text-sm font-medium">
                          {rupees(rate.basePaise)} {rate.basis === "person" ? "an adult" : "a room"}
                          <span className="block text-xs font-normal text-muted-foreground">{mealLabel[rate.mealPlan]}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-warn">No rate yet. Set one on the Prices page; until then guests see &ldquo;rate to confirm&rdquo;.</p>
                )}

                <div className="grid gap-2">
                  <p className="text-sm font-medium">
                    Units <span className="font-normal text-muted-foreground">({own.length})</span>
                  </p>
                  {own.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No units yet. Add them below.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {own.map((unit) => (
                        <li key={unit.id} className="flex items-center gap-2 rounded-lg border bg-card py-1 pr-1 pl-3 text-sm">
                          <span className="font-medium">{unit.name}</span>
                          <Badge variant="outline" className={unitLook[unit.status]}>
                            {unitWord[unit.status]}
                          </Badge>
                          {manage && (
                            <form action={setUnitStatus.bind(null, unit.id, unit.status === "active" ? "maintenance" : "active")}>
                              <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                                {unit.status === "active" ? <Wrench /> : null}
                                {unit.status === "active" ? "Maintenance" : "Back in use"}
                              </Button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {manage && <AddUnitsForm roomTypeId={type.id} suggestion={type.category === "room" ? "Room" : type.category[0].toUpperCase() + type.category.slice(1)} />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

import { asc, eq, inArray } from "drizzle-orm";
import { CalendarRange } from "lucide-react";
import { can } from "@repo/auth";
import { ageBands, getDb, rateChildPrices, rates, roomTypes, seasons } from "@repo/db";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { longDate, mealLabel, nightsLabel, rupees } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { BandForm, DeleteSeasonButton, RateDialog, RemoveRateButton, SeasonDialog, WeekendForm, type RateValues } from "./forms";

export const metadata = { title: "Prices" };

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayOrder = { weekday: 0, weekend: 1, any: 2 } as const;

/** Room rates, weekend nights, seasons and child age bands (PR-01, PR-02, PR-03, PR-05). */
export default async function PricesPage({ params }: PageProps<"/[property]/prices">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "prices.view", property.id)) return <NoAccess what="prices" />;
  const manage = can(staff, "prices.manage", property.id);
  const db = getDb();

  const types = await db.select({ id: roomTypes.id, name: roomTypes.name, status: roomTypes.status }).from(roomTypes).where(eq(roomTypes.propertyId, property.id)).orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));
  const bands = await db.select().from(ageBands).where(eq(ageBands.propertyId, property.id)).orderBy(asc(ageBands.sortOrder), asc(ageBands.minAge));
  const seasonRows = await db.select().from(seasons).where(eq(seasons.propertyId, property.id)).orderBy(asc(seasons.startsOn));
  const rateRows = types.length ? await db.select().from(rates).where(inArray(rates.roomTypeId, types.map((t) => t.id))) : [];
  const childRows = rateRows.length ? await db.select().from(rateChildPrices).where(inArray(rateChildPrices.rateId, rateRows.map((r) => r.id))) : [];

  const paidBands = bands.filter((b) => !b.free).map(({ id, label }) => ({ id, label }));
  const asValues = (rate: (typeof rateRows)[number]): RateValues & { id: string; seasonId: string | null } => ({
    id: rate.id,
    seasonId: rate.seasonId,
    roomTypeId: rate.roomTypeId,
    dayKind: rate.dayKind,
    basis: rate.basis,
    basePaise: rate.basePaise,
    extraAdultPaise: rate.extraAdultPaise,
    extraBedPaise: rate.extraBedPaise,
    mealPlan: rate.mealPlan,
    children: Object.fromEntries(childRows.filter((c) => c.rateId === rate.id).map((c) => [c.ageBandId, c.paise])),
  });
  const all = rateRows.map(asValues).sort((a, b) => dayOrder[a.dayKind] - dayOrder[b.dayKind]);
  const baseRates = all.filter((r) => r.seasonId === null);
  const notPublished = <span className="text-muted-foreground">Not published</span>;

  const rateTable = (list: typeof all, showType: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          {showType && <TableHead>Room type</TableHead>}
          <TableHead>Nights</TableHead>
          <TableHead>Price a night</TableHead>
          <TableHead>Extra adult</TableHead>
          <TableHead>Extra bed</TableHead>
          <TableHead>Children</TableHead>
          <TableHead>Meals</TableHead>
          {manage && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((rate) => (
          <TableRow key={rate.id}>
            {showType && <TableCell className="font-medium">{types.find((t) => t.id === rate.roomTypeId)?.name}</TableCell>}
            <TableCell>
              <Badge variant="outline">{nightsLabel[rate.dayKind]}</Badge>
            </TableCell>
            <TableCell className="font-medium tabular-nums">
              {rupees(rate.basePaise)} <span className="font-normal text-muted-foreground">{rate.basis === "person" ? "an adult" : "a room"}</span>
            </TableCell>
            <TableCell className="tabular-nums">{rate.extraAdultPaise === null ? notPublished : rupees(rate.extraAdultPaise)}</TableCell>
            <TableCell className="tabular-nums">{rate.extraBedPaise === null ? notPublished : rupees(rate.extraBedPaise)}</TableCell>
            <TableCell>
              {paidBands.map((band) => (
                <span key={band.id} className="block text-xs">
                  {band.label}: {rate.children[band.id] === undefined ? <span className="text-muted-foreground">not published</span> : rupees(rate.children[band.id])}
                </span>
              ))}
            </TableCell>
            <TableCell className="text-muted-foreground">{mealLabel[rate.mealPlan]}</TableCell>
            {manage && (
              <TableCell className="text-right">
                <RemoveRateButton rateId={rate.id} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <>
      <PageHeader
        title="Prices"
        description="Each room type has a price for weekday nights and one for weekend nights, or one for every night. A season's rates beat these on its nights, and a price set for a date in the calendar beats both. Children pay by age band; older guests pay as adults."
      />

      <Card>
        <CardHeader>
          <CardTitle>Weekend nights</CardTitle>
          <CardDescription>The nights that take the weekend rate (PR-02). The night of a Friday is the night from Friday to Saturday.</CardDescription>
        </CardHeader>
        <CardContent>
          {manage ? <WeekendForm propertyId={property.id} nights={property.weekendNights} /> : <p className="text-sm">{property.weekendNights.length ? property.weekendNights.map((n) => weekdayNames[n]).join(", ") : "None"}</p>}
        </CardContent>
      </Card>

      <section className="grid gap-4" aria-labelledby="rates-heading">
        <h2 id="rates-heading" className="text-lg font-semibold tracking-tight">
          Room rates
        </h2>
        {types.map((type) => {
          const own = baseRates.filter((r) => r.roomTypeId === type.id);
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
                {own.length === 0 && <CardDescription className="text-warn">No rate yet. Guests see &ldquo;rate to confirm&rdquo; for this room type.</CardDescription>}
                {manage && (
                  <CardAction>
                    <RateDialog propertyId={property.id} roomTypes={[{ id: type.id, name: type.name }]} bands={paidBands} existing={own} trigger={own.length ? "change" : "add"} title={`Rates for ${type.name}`} />
                  </CardAction>
                )}
              </CardHeader>
              {own.length > 0 && <CardContent>{rateTable(own, false)}</CardContent>}
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4" aria-labelledby="seasons-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="seasons-heading" className="text-lg font-semibold tracking-tight">
              Seasons
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">Named runs of nights with their own rates (PR-03). Where seasons overlap, the higher priority wins. A room type without a season rate keeps its usual rate.</p>
          </div>
          {manage && <SeasonDialog propertyId={property.id} />}
        </div>
        {seasonRows.length === 0 && (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarRange />
              </EmptyMedia>
              <EmptyTitle>No seasons yet</EmptyTitle>
              <EmptyDescription>Add one for Diwali, Christmas and New Year, or the monsoon.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {seasonRows.map((season) => {
          const own = all.filter((r) => r.seasonId === season.id);
          return (
            <Card key={season.id}>
              <CardHeader>
                <CardTitle>{season.name}</CardTitle>
                <CardDescription>
                  {longDate(season.startsOn)} to {longDate(season.endsOn)} · priority {season.priority}
                </CardDescription>
                {manage && (
                  <CardAction className="flex flex-wrap gap-2">
                    <RateDialog propertyId={property.id} roomTypes={types.map(({ id, name }) => ({ id, name }))} seasonId={season.id} bands={paidBands} existing={own} trigger="season" title={`${season.name}: a season rate`} />
                    <DeleteSeasonButton seasonId={season.id} name={season.name} />
                  </CardAction>
                )}
              </CardHeader>
              <CardContent>{own.length === 0 ? <p className="text-sm text-muted-foreground">No season rates yet, so every room type keeps its usual rate.</p> : rateTable(own, true)}</CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Child age bands</CardTitle>
          <CardDescription>Children pay by band (PR-05). Guests older than every band pay as adults. A free band never pays.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {bands.map((band) =>
            manage ? (
              <BandForm key={band.id} propertyId={property.id} band={band} />
            ) : (
              <p key={band.id} className="text-sm">
                {band.label}: ages {band.minAge} to {band.maxAge}
                {band.free ? ", free" : ""}
              </p>
            ),
          )}
          {manage && (
            <>
              <Separator />
              <p className="text-sm font-medium">Add a band</p>
              <BandForm propertyId={property.id} />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BedDouble, CalendarDays, ClipboardList, DoorOpen, LogIn, LogOut, MapPin, Settings2 } from "lucide-react";
import { accessibleProperties, can } from "@repo/auth";
import { getDb } from "@repo/db";
import { todayInIndia } from "@repo/engine";
import { properties as sites } from "@repo/sites";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resortsAtAGlance } from "@/lib/dashboard";
import { longDate, partOfDay, plural, rupees } from "@/lib/format";
import { resortPhoto } from "@/lib/resorts";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "All resorts" };

/** The group's day across its resorts, and a card for each one. Someone at one resort goes straight to it. */
export default async function HomePage() {
  const staff = await requireStaffPage();
  const resorts = await accessibleProperties(getDb(), staff);
  if (resorts.length === 1) redirect(`/${resorts[0].code.toLowerCase()}`);
  const today = todayInIndia();
  const glance = await resortsAtAGlance(
    resorts.map((r) => r.id),
    today,
  );

  // Each number counts only the resorts where this person may see it.
  const sees = (resortId: string) => ({
    people: can(staff, "bookings.view", resortId),
    rooms: can(staff, "inventory.view", resortId),
    money: can(staff, "reports.view", resortId) || can(staff, "reports.daily", resortId),
  });
  const total = (pick: (g: NonNullable<ReturnType<typeof glance.get>>) => number, gate: "people" | "rooms" | "money") =>
    resorts.reduce((sum, r) => sum + (sees(r.id)[gate] ? pick(glance.get(r.id)!) : 0), 0);
  const anyPeople = resorts.some((r) => sees(r.id).people);
  const anyRooms = resorts.some((r) => sees(r.id).rooms);
  const anyMoney = resorts.some((r) => sees(r.id).money);
  const units = total((g) => g.units, "rooms");
  const booked = total((g) => g.bookedTonight, "rooms");

  return (
    <>
      <PageHeader
        title={`Good ${partOfDay()}, ${staff.name.split(" ")[0]}`}
        description={`The Prathamesh Group today, ${longDate(today)}. Choose a resort to see its day, bookings and rooms.`}
      />

      {(anyPeople || anyRooms) && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {anyPeople && (
            <>
              <StatCard label="Arriving today" value={String(total((g) => g.arrivals, "people"))} note="Stays and day visits, all resorts" icon={LogIn} />
              <StatCard label="Leaving today" value={String(total((g) => g.departures, "people"))} note="Stays ending today" icon={LogOut} />
              <StatCard label="In the resorts" value={String(total((g) => g.inHouse, "people"))} note="Bookings checked in now" icon={DoorOpen} />
            </>
          )}
          {anyRooms && (
            <StatCard
              label="Rooms booked tonight"
              value={units ? `${Math.round((booked / units) * 100)}%` : "–"}
              meter={units ? { share: booked / units, label: `${booked} of ${units} rooms booked tonight` } : undefined}
              note={units ? `${booked} of ${plural(units, "room")} in use` : "No rooms in use yet"}
              icon={BedDouble}
            />
          )}
        </div>
      )}

      <section className="grid gap-4" aria-labelledby="resorts-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="resorts-title" className="text-lg font-semibold">
              Resorts
            </h2>
            <p className="text-sm text-muted-foreground">{anyMoney ? "Today's guests, tonight's rooms and this month's sales at each resort." : "Today's guests and tonight's rooms at each resort."}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {resorts.map((resort, index) => {
            const site = sites.find((s) => s.code === resort.code);
            const g = glance.get(resort.id)!;
            const may = sees(resort.id);
            const base = `/${resort.code.toLowerCase()}`;
            const photo = resortPhoto[resort.code];
            const ready = g.units > 0;
            const stats = [
              { label: "Arriving", value: may.people ? String(g.arrivals) : "–" },
              { label: "Leaving", value: may.people ? String(g.departures) : "–" },
              { label: "In now", value: may.people ? String(g.inHouse) : "–" },
              { label: "Tonight", value: may.rooms && ready ? `${Math.round((g.bookedTonight / g.units) * 100)}%` : "–", detail: may.rooms && ready ? `${g.bookedTonight} of ${g.units} rooms` : undefined },
            ];
            return (
              <Card key={resort.id} className="group/resort gap-0 overflow-hidden py-0 shadow-xs transition-shadow hover:shadow-md">
                <Link href={base} className="relative block aspect-[16/7] overflow-hidden bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset" aria-label={`Open ${site?.shortName ?? resort.name}`}>
                  {photo && (
                    <Image src={photo} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" placeholder="blur" loading={index < 2 ? "eager" : "lazy"} className="object-cover transition-transform duration-500 group-hover/resort:scale-[1.03]" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
                    <span className="grid gap-0.5">
                      <span className="text-xl font-semibold tracking-tight">{site?.shortName ?? resort.name}</span>
                      <span className="flex items-center gap-1 text-sm text-white/80">
                        <MapPin className="size-3.5" />
                        {site?.place ?? resort.name}
                      </span>
                    </span>
                    <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-xs font-medium backdrop-blur">{resort.code}</span>
                  </span>
                </Link>

                {ready ? (
                  <>
                    <dl className="grid grid-cols-4 divide-x border-b">
                      {stats.map((stat) => (
                        <div key={stat.label} className="px-4 py-3.5">
                          <dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
                          <dd className="mt-0.5 text-xl font-semibold tabular-nums">{stat.value}</dd>
                          {stat.detail && <dd className="text-xs text-muted-foreground tabular-nums">{stat.detail}</dd>}
                        </div>
                      ))}
                    </dl>
                    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <p className="min-w-0 truncate text-sm text-muted-foreground">
                        {may.money ? (
                          <>
                            <span className="font-medium text-foreground tabular-nums">{rupees(g.salesMonthPaise)}</span> sold this month
                          </>
                        ) : (
                          `${plural(g.roomTypes, "room type")}, ${plural(g.units, "room")}`
                        )}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        {may.people && (
                          <Button variant="ghost" size="icon" asChild className="size-8 text-muted-foreground">
                            <Link href={`${base}/bookings`} aria-label={`Bookings at ${site?.shortName ?? resort.name}`} title="Bookings">
                              <ClipboardList />
                            </Link>
                          </Button>
                        )}
                        {may.rooms && (
                          <Button variant="ghost" size="icon" asChild className="size-8 text-muted-foreground">
                            <Link href={`${base}/calendar`} aria-label={`Calendar at ${site?.shortName ?? resort.name}`} title="Calendar">
                              <CalendarDays />
                            </Link>
                          </Button>
                        )}
                        <Button size="sm" asChild className="ml-1">
                          <Link href={base}>
                            Open
                            <ArrowRight />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm sm:flex-nowrap">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <BedDouble className="size-4" />
                    </span>
                    <p className="min-w-0 flex-1 text-muted-foreground">
                      <span className="block font-medium text-foreground">No rooms set up yet</span>
                      Add its room types and rooms to take bookings here.
                    </p>
                    {can(staff, "rooms.manage", resort.id) ? (
                      <Button size="sm" variant="outline" asChild className="shrink-0">
                        <Link href={`${base}/rooms`}>
                          <Settings2 />
                          Set up rooms
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild className="shrink-0">
                        <Link href={base}>
                          Open
                          <ArrowRight />
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}

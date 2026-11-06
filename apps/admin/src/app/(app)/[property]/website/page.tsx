import type { ReactNode } from "react";
import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { ArrowRight, BadgePercent, BedDouble, CalendarRange, ExternalLink, Globe, Link2, Megaphone, NotebookPen, Ticket } from "lucide-react";
import { can } from "@repo/auth";
import { getDb, roomTypes, siteNotices } from "@repo/db";
import { todayInIndia, websiteCatalogue } from "@repo/engine";
import { studioUrl } from "@repo/sanity/config";
import { properties as sites } from "@repo/sites";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ago, plural, rupees, shortDate } from "@/lib/format";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { websiteUrls } from "@/lib/website";
import { DeleteNoticeButton, NoticeDialog, NoticeSwitch, RefreshWebsiteButton } from "./forms";

export const metadata = { title: "Website" };

type Notice = typeof siteNotices.$inferSelect;
type Status = { label: string; tone: "good" | "wait" | "off" };

const tones: Record<Status["tone"], string> = {
  good: "bg-good/10 text-good hover:bg-good/10",
  wait: "bg-secondary text-secondary-foreground hover:bg-secondary",
  off: "border-border bg-transparent text-muted-foreground hover:bg-transparent",
};

/**
 * A resort's website, as the admin runs it (docs/implementation-plan.md,
 * section 9: Website): its connection to the admin, its notices, and what
 * its Stays and Day packages pages show from here.
 */
export default async function WebsitePage({ params }: PageProps<"/[property]/website">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "website.manage", property.id)) return <NoAccess what="the website" />;
  const db = getDb();
  const [notices, catalogue, [hidden]] = await Promise.all([
    db.select().from(siteNotices).where(eq(siteNotices.propertyId, property.id)).orderBy(desc(siteNotices.createdAt)),
    websiteCatalogue(db, property.code),
    db
      .select({ n: count() })
      .from(roomTypes)
      .where(and(eq(roomTypes.propertyId, property.id), eq(roomTypes.status, "active"), eq(roomTypes.onWebsite, false))),
  ]);
  const site = sites.find((s) => s.code === property.code);
  const connected = websiteUrls()[property.code] ?? null;
  const address = connected ?? site?.url ?? null;
  const base = `/${property.code.toLowerCase()}`;
  const today = todayInIndia();

  // The website shows one notice at a time: the newest that is on today.
  const isOn = (n: Notice) => n.active && (!n.startsOn || n.startsOn <= today) && (!n.endsOn || n.endsOn >= today);
  const showing = notices.find(isOn);
  const statusOf = (n: Notice): Status => {
    if (n === showing) return { label: "On the website now", tone: "good" };
    if (isOn(n)) return { label: "Waiting: a newer notice shows first", tone: "wait" };
    if (!n.active) return { label: "Off", tone: "off" };
    if (n.endsOn && n.endsOn < today) return { label: "Ended", tone: "off" };
    return { label: `Starts ${shortDate(n.startsOn!)}`, tone: "wait" };
  };
  // The one on the website first, then others on now, then those still to come, then the ones off or over. Newest first in each.
  const rank = (n: Notice) => (n === showing ? 0 : isOn(n) ? 1 : n.active && (!n.endsOn || n.endsOn >= today) ? 2 : 3);
  const ordered = [...notices].sort((a, b) => rank(a) - rank(b));

  const stays = catalogue?.roomTypes ?? [];
  const passes = catalogue?.passes ?? [];
  const offers = catalogue?.offers ?? [];

  return (
    <>
      <PageHeader
        title="Website"
        description={`What ${property.name}'s website shows from the admin, and short notices for its guests.`}
        actions={
          address && (
            <Button variant="outline" asChild>
              <a href={address} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open the website
              </a>
            </Button>
          )
        }
      />

      <Card className="py-5 shadow-xs">
        <CardContent className="flex flex-wrap items-start gap-x-3 gap-y-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary ring-1 ring-primary/10 ring-inset">
            <Globe className="size-4" />
          </span>
          <div className="grid min-w-0 flex-1 basis-60 gap-1.5">
            <p className="flex flex-wrap items-center gap-2 leading-none font-semibold">
              {address ? address.replace(/^https?:\/\//, "") : property.name}
              {connected ? (
                <Badge className={tones.good}>
                  <span className="size-1.5 rounded-full bg-current" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="border-warn/30 text-warn">
                  Not connected
                </Badge>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {connected
                ? "It reads its rooms, rates, day packages, offers and notices from here, and refreshes by itself a moment after each change."
                : "The admin needs this website's address in WEBSITE_URLS, and the shared REVALIDATE_SECRET, to refresh it after a change. Until then, changes reach the website within a day."}
            </p>
          </div>
          <div className="max-sm:pl-12">
            <RefreshWebsiteButton propertyId={property.id} disabled={!connected} />
          </div>
        </CardContent>
      </Card>

      <Card className="py-5 shadow-xs">
        <CardContent className="flex flex-wrap items-start gap-x-3 gap-y-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary ring-1 ring-primary/10 ring-inset">
            <NotebookPen className="size-4" />
          </span>
          <div className="grid min-w-0 flex-1 basis-60 gap-1.5">
            <p className="leading-none font-semibold">Blog, FAQs and policies</p>
            <p className="text-sm text-muted-foreground">
              Editors write these in Sanity Studio, in this resort&apos;s folder. The website shows a change a moment after it is published. Rates and
              dates stay here in the admin, so keep them out of that text.
            </p>
          </div>
          <div className="max-sm:pl-12">
            <Button variant="outline" asChild>
              <a href={`${studioUrl}/structure/resort-${property.code}`} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open Sanity Studio
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0 shadow-xs">
        <CardHeader className="border-b py-5 [.border-b]:pb-5">
          <CardTitle>Notices</CardTitle>
          <CardDescription>
            A short message in a small card on every page, such as &ldquo;The pool is closed for cleaning on 12 November&rdquo;. One shows at a time, the newest that is on. Guests can close it.
          </CardDescription>
          {notices.length > 0 && (
            <CardAction>
              <NoticeDialog propertyId={property.id} />
            </CardAction>
          )}
        </CardHeader>
        {notices.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Megaphone />
              </EmptyMedia>
              <EmptyTitle>No notices yet</EmptyTitle>
              <EmptyDescription>Tell guests about a closed pool, a festival menu or a new offer, for the days it matters.</EmptyDescription>
            </EmptyHeader>
            <NoticeDialog propertyId={property.id} first />
          </Empty>
        ) : (
          <ul className="divide-y">
            {ordered.map((notice) => {
              const status = statusOf(notice);
              return (
                <li key={notice.id} className={`grid gap-3 px-6 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start ${status.tone === "off" ? "bg-muted/30" : ""}`}>
                  <div className="grid min-w-0 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={tones[status.tone]}>{status.label}</Badge>
                      <Badge variant="outline" className="font-normal">
                        <CalendarRange />
                        {notice.startsOn || notice.endsOn ? `${notice.startsOn ? shortDate(notice.startsOn) : "Now"} – ${notice.endsOn ? shortDate(notice.endsOn) : "no end"}` : "Every day"}
                      </Badge>
                    </div>
                    <p className={`text-pretty break-words ${status.tone === "off" ? "text-muted-foreground" : ""}`}>{notice.message}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {notice.linkUrl && notice.linkLabel && (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <Link2 className="size-3.5 shrink-0" />
                          <span className="font-medium text-foreground">{notice.linkLabel}</span>
                          <span className="truncate">{notice.linkUrl}</span>
                        </span>
                      )}
                      <span>Added {ago(notice.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 sm:justify-end">
                    <NoticeDialog
                      propertyId={property.id}
                      notice={{
                        id: notice.id,
                        message: notice.message,
                        linkLabel: notice.linkLabel,
                        linkUrl: notice.linkUrl,
                        startsOn: notice.startsOn,
                        endsOn: notice.endsOn,
                        active: notice.active,
                      }}
                    />
                    <NoticeSwitch noticeId={notice.id} active={notice.active} />
                    <DeleteNoticeButton noticeId={notice.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-1">
        <h2 className="text-base font-semibold">What the website shows</h2>
        <p className="text-sm text-muted-foreground">From the admin, as the website sees it now. Photos stay with the website, matched by each room type&apos;s and package&apos;s code.</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <ShowsCard
          icon={<BedDouble />}
          title="Stays page"
          line={stays.length ? `${plural(stays.length, "room type")}${hidden.n ? `. ${hidden.n} more ${hidden.n === 1 ? "is" : "are"} kept off the website` : ""}.` : "None on sale here yet, so the page shows the website's own list."}
          items={stays.map((type) => {
            const lowest = [...type.rates].sort((a, b) => a.basePaise - b.basePaise)[0];
            return { key: type.code, name: type.name, note: lowest ? `From ${rupees(lowest.basePaise)} ${lowest.basis === "person" ? "a guest" : "a night"}` : "Rate on request" };
          })}
          href={`${base}/rooms`}
          action="Rooms"
        />
        {site?.dayPackagesPage ? (
          <ShowsCard
            icon={<Ticket />}
            title="Day packages page"
            line={passes.length ? `${plural(passes.length, "package")} on sale.` : "None on sale here yet, so the page shows the website's own list."}
            items={passes.map((pass) => ({ key: pass.code, name: pass.name, note: [`${rupees(pass.adultPaise)} an adult`, pass.hours].filter(Boolean).join(", ") }))}
            href={`${base}/packages`}
            action="Packages"
          />
        ) : (
          <ShowsCard icon={<Ticket />} title="Day packages" line="This website has no Day packages page. Its packages are sold at the desk." items={[]} href={`${base}/packages`} action="Packages" />
        )}
        <ShowsCard
          icon={<BadgePercent />}
          title="Offers"
          line={offers.length ? `${plural(offers.length, "offer")} on the website, under the booking planners.` : "No offers on the website now."}
          items={offers.map((offer) => ({ key: offer.title, name: offer.title, note: offer.label }))}
          href={`${base}/offers`}
          action="Offers"
        />
      </div>
    </>
  );
}

function ShowsCard({ icon, title, line, items, href, action }: { icon: ReactNode; title: string; line: string; items: { key: string; name: string; note: string }[]; href: string; action: string }) {
  const shown = items.slice(0, 6);
  return (
    <Card className="gap-4 shadow-xs">
      <CardHeader className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">{icon}</span>
        <div className="grid min-w-0 gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{line}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {shown.length > 0 && (
          <ul className="grid gap-0.5 text-sm">
            {shown.map((item) => (
              <li key={item.key} className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 odd:bg-muted/40">
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.note}</span>
              </li>
            ))}
            {items.length > shown.length && <li className="px-2 pt-1 text-xs text-muted-foreground">And {plural(items.length - shown.length, "more", "more")}</li>}
          </ul>
        )}
        <Button variant="ghost" size="sm" className="justify-self-start" asChild>
          <Link href={href}>
            {action}
            <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

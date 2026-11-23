import Link from "next/link";
import { eq } from "drizzle-orm";
import { CalendarClock, Download, Inbox, KanbanSquare, List, Search, X } from "lucide-react";
import { getDb, leadAssignmentRules } from "@repo/db";
import { z } from "zod";
import { can } from "@repo/auth";
import { todayInIndia } from "@repo/engine";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { NoAccess } from "@/components/no-access";
import { PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ago, leadInterestLabel, leadSourceLabel, plural, shortDate } from "@/lib/format";
import { findLeads, leadCounts, leadWorkers, type LeadFilters } from "@/lib/leads";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { LeadBoard } from "./board";
import { AssignmentRulesDialog, NewLeadDialog } from "./forms";

export const metadata = { title: "Leads" };

const filterInput = z.object({
  status: z.enum(["open", "new", "contacted", "site_visit_scheduled", "site_visit_done", "quoted", "negotiation", "won", "lost"]).optional().catch(undefined),
  interest: z.enum(["stay", "day", "wedding", "corporate", "event", "other"]).optional().catch(undefined),
  view: z.literal("board").optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  mine: z.literal("1").optional().catch(undefined),
});

/**
 * Everyone who asked and hasn't booked yet (docs/implementation-plan.md,
 * section 9: Leads). Website booking requests and enquiries arrive here by
 * themselves; staff add the ones that come by phone.
 */
export default async function LeadsPage({ params, searchParams }: PageProps<"/[property]/leads">) {
  const staff = await requireStaffPage();
  const property = await propertyFromCode((await params).property, staff);
  if (!can(staff, "leads.view", property.id)) return <NoAccess what="leads" />;

  const raw = Object.fromEntries(Object.entries(await searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value || undefined]));
  const input = filterInput.parse(raw);
  const status = input.status ?? "open";
  const board = input.view === "board";
  // The board shows every stage, so it ignores the stage tabs.
  const filters: LeadFilters = { status: board ? undefined : status, interest: input.interest, q: input.q, mine: input.mine ? staff.userId : undefined };
  const manage = can(staff, "leads.manage", property.id);
  const today = todayInIndia();
  const [rows, counts] = await Promise.all([findLeads(property.id, filters), leadCounts(property.id, today)]);
  const workers = manage ? await leadWorkers(property.id) : [];
  const rules = manage ? (await getDb().select().from(leadAssignmentRules).where(eq(leadAssignmentRules.propertyId, property.id))).map((r) => ({ interest: r.interest, userIds: r.userIds })) : [];
  const base = `/${property.code.toLowerCase()}/leads`;
  const link = (changes: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries({ status: input.status, interest: input.interest, q: input.q, mine: input.mine, view: input.view, ...changes })) if (value) query.set(key, value);
    const text = query.toString();
    return text ? `${base}?${text}` : base;
  };
  const views = [
    { key: "open", label: "Open", count: counts.open },
    { key: "new", label: "New", count: counts.new },
    { key: "contacted", label: "Contacted", count: counts.contacted },
    { key: "site_visit_scheduled", label: "Site visit booked", count: counts.site_visit_scheduled },
    { key: "site_visit_done", label: "Site visit done", count: counts.site_visit_done },
    { key: "quoted", label: "Quotation sent", count: counts.quoted },
    { key: "negotiation", label: "Negotiation", count: counts.negotiation },
    { key: "won", label: "Booked", count: counts.won },
    { key: "lost", label: "Lost", count: counts.lost },
  ] as const;
  const filtered = Boolean(input.interest || input.q || input.mine);

  return (
    <>
      <PageHeader
        title="Leads"
        description="Everyone who asked about a stay, a day visit, a wedding or an event and hasn't booked yet. Requests from the website arrive here by themselves."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={board ? link({ view: undefined }) : link({ view: "board" })}>
                {board ? <List /> : <KanbanSquare />}
                {board ? "List" : "Board"}
              </Link>
            </Button>
            {can(staff, "leads.export", property.id) && (
              <Button variant="outline" asChild>
                <a href={`${base}/export?format=xlsx`}>
                  <Download />
                  Excel
                </a>
              </Button>
            )}
            {manage && <AssignmentRulesDialog propertyId={property.id} workers={workers} rules={rules} />}
            {manage && <NewLeadDialog propertyId={property.id} />}
          </div>
        }
      />

      {counts.due > 0 && (
        <Link href={link({ status: "open" })} className="flex items-center gap-3 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn transition-colors hover:bg-warn/15">
          <CalendarClock className="size-4 shrink-0" />
          <span>
            <span className="font-semibold">{plural(counts.due, "follow-up")}</span> due today or earlier. They are at the top of each list with the date in amber.
          </span>
        </Link>
      )}

      {board && (
        <LeadBoard
          base={base}
          canMove={manage}
          leads={rows.map((row) => ({ id: row.id, name: row.name, status: row.status, interest: row.interest, guests: row.guests, dateFrom: row.dateFrom, due: row.due, followUpOn: row.followUpOn, estimatedValuePaise: row.estimatedValuePaise, assignedName: row.assignedName, assignedImage: row.assignedImage }))}
        />
      )}

      <Card className={`gap-0 overflow-hidden py-0 ${board ? "hidden" : ""}`}>
        <div className="grid gap-3 border-b bg-muted/30 p-4">
          <nav aria-label="Lead lists" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
            {views.map((view) => {
              const active = status === view.key;
              return (
                <Link
                  key={view.key}
                  href={link({ status: view.key === "open" ? undefined : view.key })}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-background text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
                >
                  {view.label}
                  <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-primary/10 text-primary" : "bg-foreground/[0.06]"}`}>{view.count}</span>
                </Link>
              );
            })}
          </nav>
          <form role="search" className="flex flex-wrap items-center gap-2">
            {input.status && <input type="hidden" name="status" value={input.status} />}
            <InputGroup className="max-w-80 min-w-56 flex-1 bg-background">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput name="q" type="search" defaultValue={input.q} placeholder="Name, phone or email" aria-label="Search leads" />
            </InputGroup>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(leadInterestLabel) as (keyof typeof leadInterestLabel)[]).map((interest) => (
                <Button key={interest} variant={input.interest === interest ? "secondary" : "ghost"} size="sm" asChild className={input.interest === interest ? "font-semibold" : "text-muted-foreground"}>
                  <Link href={link({ interest: input.interest === interest ? undefined : interest })}>{leadInterestLabel[interest]}</Link>
                </Button>
              ))}
            </div>
            <Button variant={input.mine ? "secondary" : "ghost"} size="sm" asChild className={input.mine ? "font-semibold" : "text-muted-foreground"}>
              <Link href={link({ mine: input.mine ? undefined : "1" })}>Mine</Link>
            </Button>
            {filtered && (
              <Button variant="ghost" size="sm" asChild className="ml-auto text-muted-foreground">
                <Link href={link({ interest: undefined, q: undefined, mine: undefined })}>
                  <X />
                  Clear
                </Link>
              </Button>
            )}
          </form>
        </div>

        {rows.length === 0 ? (
          <Empty className="m-4 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>{filtered ? "No leads match" : "Nothing here"}</EmptyTitle>
              <EmptyDescription>{filtered ? "Try another name or number, or clear the filters." : "Booking requests and enquiries from the website appear here as they arrive."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Guest</TableHead>
                <TableHead>Wants</TableHead>
                <TableHead className="hidden md:table-cell">When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Follow up</TableHead>
                <TableHead className="hidden lg:table-cell">Worked by</TableHead>
                <TableHead className="pr-4 text-right">Came</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...rows]
                .sort((a, b) => Number(b.due) - Number(a.due))
                .map((row) => (
                  <TableRow key={row.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`${base}/${row.id}`} className="font-medium after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset">
                        {row.name}
                      </Link>
                      {row.phone && <span className="block text-xs text-muted-foreground tabular-nums">+{row.phone}</span>}
                    </TableCell>
                    <TableCell>
                      <span className="block">{leadInterestLabel[row.interest]}</span>
                      {row.guests ? <span className="text-xs text-muted-foreground">{plural(row.guests, "guest")}</span> : null}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {row.dateFrom ? (row.dateTo ? `${shortDate(row.dateFrom)} – ${shortDate(row.dateTo)}` : shortDate(row.dateFrom)) : "Not said"}
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {row.followUpOn ? (
                        <span className={row.due ? "font-medium text-warn" : "text-muted-foreground"}>
                          {row.followUpOn === today ? "Today" : shortDate(row.followUpOn)}
                          {row.followUpTime ? `, ${row.followUpTime.slice(0, 5)}` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {row.assignedName ? (
                        <span className="flex items-center gap-2">
                          <PersonAvatar name={row.assignedName} image={row.assignedImage} className="size-6 rounded-full" />
                          <span className="truncate">{row.assignedName.split(" ")[0]}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No one yet</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <span className="block whitespace-nowrap text-muted-foreground">{ago(row.createdAt)}</span>
                      <Badge variant="outline" className="mt-0.5 font-normal text-muted-foreground">
                        {row.source.startsWith("website") ? "Website" : leadSourceLabel[row.source]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
        <div className="border-t bg-muted/30 px-4 py-3 text-sm text-muted-foreground" role="status">
          {plural(rows.length, "lead")}
          {rows.length === 200 ? ", the latest 200" : ""}
        </div>
      </Card>
    </>
  );
}

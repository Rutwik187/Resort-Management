import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft, Banknote, CalendarClock, CalendarPlus, CircleAlert, ClipboardCheck, Combine, FileText, Globe, Mail, MessageCircle, MessageSquareText, Pencil, Phone, PhoneCall, Sparkles, UserRound, Users } from "lucide-react";
import { z } from "zod";
import { can } from "@repo/auth";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { MessagesCard } from "@/components/messages-card";
import { NoAccess } from "@/components/no-access";
import { PersonAvatar } from "@/components/person-avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { ago, leadInterestLabel, leadSourceLabel, leadStatusLabel, longDate, rupees, shortDate, when } from "@/lib/format";
import { getDb } from "@repo/db";
import { duplicateLeads } from "@repo/engine";
import { leadWorkers, loadLead } from "@/lib/leads";
import { propertyFromCode, requireStaffPage } from "@/lib/staff";
import { AssignSelect, FollowUpField, LeadAdvanceDialog, LeadDetailsDialog, LeadNoteForm, LeadStatusForm, LogActivityForm, MergeLeadButton, QuotationDialog } from "../forms";

export const metadata = { title: "Lead" };

type RequestLines = { lines?: { title: string; detail: string; amount: number | null }[]; total?: number | null };

/** One lead: what they asked, the website request, the timeline, and the work on it. */
export default async function LeadPage({ params }: PageProps<"/[property]/leads/[id]">) {
  const staff = await requireStaffPage();
  const { property: code, id } = await params;
  const property = await propertyFromCode(code, staff);
  if (!can(staff, "leads.view", property.id)) return <NoAccess what="leads" />;
  if (!z.uuid().safeParse(id).success) notFound();
  const loaded = await loadLead(property.id, id);
  if (!loaded) notFound();
  const { lead, activities, people, booking, earlier } = loaded;
  const manage = can(staff, "leads.manage", property.id);
  const base = `/${property.code.toLowerCase()}`;
  const request = (lead.request ?? null) as RequestLines | null;
  const workers = manage ? await leadWorkers(property.id) : [];
  const duplicates = await duplicateLeads(getDb(), lead);
  const quotations = activities.filter((a) => a.type === "quotation");
  const open = lead.status !== "won" && lead.status !== "lost";

  // Make a booking with the lead's dates and guest filled in.
  const bookingQuery = new URLSearchParams({ lead: lead.id });
  if (lead.interest === "day" && lead.dateFrom) {
    bookingQuery.set("kind", "day");
    bookingQuery.set("day", lead.dateFrom);
  } else if (lead.dateFrom && lead.dateTo) {
    bookingQuery.set("checkIn", lead.dateFrom);
    bookingQuery.set("checkOut", lead.dateTo);
  } else if (lead.interest === "day") {
    bookingQuery.set("kind", "day");
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <PersonAvatar name={lead.name} className="size-12 rounded-full text-base max-sm:hidden" />
          <div className="min-w-0 space-y-1.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
              <LeadStatusBadge status={lead.status} />
              <span className="font-medium text-foreground">{leadInterestLabel[lead.interest]}</span>
              <span>
                · {leadSourceLabel[lead.source]}, {ago(lead.createdAt)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lead.phone && (
            <>
              <Button variant="outline" asChild>
                <a href={`tel:+${lead.phone}`}>
                  <Phone />
                  Call
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer">
                  <MessageCircle />
                  WhatsApp
                </a>
              </Button>
            </>
          )}
          {manage && (
            <LeadDetailsDialog
              lead={{ id: lead.id, name: lead.name, phone: lead.phone, email: lead.email, interest: lead.interest, dateFrom: lead.dateFrom, dateTo: lead.dateTo, guests: lead.guests, budget: lead.budget, estimatedValuePaise: lead.estimatedValuePaise }}
            />
          )}
          {manage && open && <QuotationDialog leadId={lead.id} suggested={(request?.lines ?? []).map((line) => ({ title: `${line.title}${line.detail ? `, ${line.detail}` : ""}`, ratePaise: line.amount === null ? null : Math.round(line.amount * 100) }))} />}
          {manage && open && <LeadAdvanceDialog leadId={lead.id} />}
          {open && can(staff, "bookings.create", property.id) && (
            <Button asChild>
              <Link href={`${base}/bookings/new?${bookingQuery}`}>
                <CalendarPlus />
                Make a booking
              </Link>
            </Button>
          )}
        </div>
      </div>

      {lead.status === "lost" && lead.lostReason && (
        <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <CircleAlert className="size-4 shrink-0" />
          Lost: {lead.lostReason}
        </p>
      )}

      {manage && duplicates.length > 0 && (
        <div className="grid gap-2 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-warn">
            <Combine className="size-4" />
            {duplicates.length === 1 ? "Another lead has this phone number." : `${duplicates.length} other leads have this phone number.`} Merge a duplicate into this one so the team works it once.
          </p>
          <ul className="grid gap-1.5">
            {duplicates.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`${base}/leads/${d.id}`} className="hover:underline">
                  {d.name} · {leadInterestLabel[d.interest]} · {ago(d.createdAt)}
                </Link>
                <span className="flex items-center gap-2">
                  <LeadStatusBadge status={d.status} />
                  {!d.bookingId && <MergeLeadButton keepId={lead.id} mergeId={d.id} name={d.name} />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-4">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>What they asked</CardTitle>
              <CardDescription>{lead.source.startsWith("website") ? "Sent from the website, with the same message on WhatsApp." : "Taken by the team."}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Fact label="Wants" value={leadInterestLabel[lead.interest]} />
                <Fact label={lead.dateTo ? "From" : "Date"} value={lead.dateFrom ? longDate(lead.dateFrom) : "Not said"} />
                {lead.dateTo && <Fact label="Until" value={longDate(lead.dateTo)} />}
                <Fact label="Guests" value={lead.guests ? String(lead.guests) : "Not said"} />
                {lead.budget && <Fact label="Budget" value={lead.budget} />}
                {lead.estimatedValuePaise !== null && <Fact label="Estimated value" value={rupees(lead.estimatedValuePaise)} />}
                {lead.advancePaise > 0 && <Fact label="Advance taken" value={rupees(lead.advancePaise)} />}
              </dl>
              {lead.details && Object.keys(lead.details).length > 0 && (
                <dl className="grid gap-x-6 gap-y-3 rounded-lg border p-4 sm:grid-cols-2">
                  {Object.entries(lead.details).map(([key, value]) => (
                    <Fact key={key} label={key} value={value} />
                  ))}
                </dl>
              )}
              {(lead.phone || lead.email) && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {lead.phone && (
                    <a href={`tel:+${lead.phone}`} className="flex items-center gap-2 hover:underline">
                      <Phone className="size-4 text-muted-foreground" />
                      <span className="tabular-nums">+{lead.phone}</span>
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-2 break-all hover:underline">
                      <Mail className="size-4 text-muted-foreground" />
                      {lead.email}
                    </a>
                  )}
                </div>
              )}
              {request?.lines && request.lines.length > 0 && (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableBody>
                      {request.lines.map((line, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-normal">
                            <span className="font-medium">{line.title}</span>
                            <span className="block text-xs text-muted-foreground">{line.detail}</span>
                          </TableCell>
                          <TableCell className="text-right align-top tabular-nums">{line.amount === null ? <span className="text-muted-foreground">Rate to confirm</span> : rupees(line.amount * 100)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-semibold">Estimate shown on the website</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{request.total == null ? "To confirm" : `${rupees(request.total * 100)} + GST`}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
              {lead.message && <p className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap">{lead.message}</p>}
            </CardContent>
          </Card>

          {quotations.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>Quotations</CardTitle>
                <CardDescription>Open one to print it or save it as a PDF.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-1">
                  {quotations.map((q) => (
                    <li key={q.id}>
                      <Link href={`${base}/leads/${lead.id}/quote/${q.id}`} target="_blank" className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                        <span className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          Quotation {q.id} · {when(q.at)}
                        </span>
                        <span className="tabular-nums">{rupees((q.data as { subtotalPaise: number }).subtotalPaise)} + GST</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {(lead.campaign || lead.consent) && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>Where it came from</CardTitle>
                <CardDescription>The ad campaign and the consent the guest gave on the form.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {lead.campaign && (
                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {Object.entries(lead.campaign).map(([key, value]) => (
                      <Fact key={key} label={campaignLabel[key] ?? key} value={value} />
                    ))}
                  </dl>
                )}
                {lead.consent && (
                  <p className="text-muted-foreground">
                    Agreed to the privacy policy (version {lead.consent.version}) {lead.consent.marketing ? "and to hear about offers" : "but not to offers"}.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Everything that happened to this lead, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative grid gap-5 border-l pl-6">
                {activities.map((activity) => {
                  const data = (activity.data ?? {}) as Record<string, string | null>;
                  const by = activity.userId ? (people.get(activity.userId)?.name ?? "Staff") : "The website";
                  const { icon: Icon, text } = describe(activity.type, data, people);
                  return (
                    <li key={activity.id} className="relative">
                      <span className="absolute top-0 -left-[2.3rem] flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <p className="text-sm font-medium">{text}</p>
                      {activity.note && <p className="mt-0.5 text-sm whitespace-pre-wrap">{activity.note}</p>}
                      <p className="text-xs text-muted-foreground">
                        {when(activity.at)} · {by}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          {booking && (
            <Card className="border-good/30 bg-good/[0.04] shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="size-4 text-good" />
                  Booked
                </CardTitle>
                <CardDescription>This lead became a booking.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <Link href={`${base}/bookings/${booking.number.toLowerCase()}`} className="font-mono text-sm font-medium hover:underline">
                  {booking.number}
                </Link>
                <StatusBadge status={booking.status} />
              </CardContent>
            </Card>
          )}

          {manage ? (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>Work the lead</CardTitle>
                <CardDescription>Changes save as you make them.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <LeadStatusForm key={lead.status} leadId={lead.id} status={lead.status} />
                <AssignSelect key={lead.assignedTo ?? "none"} leadId={lead.id} assignedTo={lead.assignedTo} workers={workers} />
                <FollowUpField key={`${lead.followUpOn}-${lead.followUpTime}`} leadId={lead.id} value={lead.followUpOn} time={lead.followUpTime} />
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p>{leadStatusLabel[lead.status]}</p>
                <p className="text-muted-foreground">Worked by {lead.assignedTo ? (people.get(lead.assignedTo)?.name ?? "staff") : "no one yet"}.</p>
                {lead.followUpOn && <p className="text-muted-foreground">Follow up on {shortDate(lead.followUpOn)}.</p>}
              </CardContent>
            </Card>
          )}

          {manage && (
            <Card className="shadow-xs">
              <CardContent className="grid gap-6">
                <LogActivityForm leadId={lead.id} />
                <LeadNoteForm leadId={lead.id} />
              </CardContent>
            </Card>
          )}

          <MessagesCard leadId={lead.id} />

          {earlier.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle>Earlier from this number</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-1">
                  {earlier.map((other) => (
                    <li key={other.id}>
                      <Link href={`${base}/leads/${other.id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                        <span>
                          {leadInterestLabel[other.interest]} <span className="text-muted-foreground">· {ago(other.createdAt)}</span>
                        </span>
                        <LeadStatusBadge status={other.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

const campaignLabel: Record<string, string> = {
  utm_source: "Source",
  utm_medium: "Medium",
  utm_campaign: "Campaign",
  utm_term: "Search term",
  utm_content: "Ad",
  gclid: "Google click ID",
  fbclid: "Meta click ID",
  landing: "Landing page",
  referrer: "Came from",
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

/** One timeline entry in words, with its icon. */
function describe(type: string, data: Record<string, string | null>, people: Map<string, { name: string }>) {
  const status = (value: string | null) => (value && value in leadStatusLabel ? leadStatusLabel[value as keyof typeof leadStatusLabel].toLowerCase() : "unknown");
  switch (type) {
    case "created":
      return { icon: data.source?.startsWith("website") ? Globe : Sparkles, text: data.source?.startsWith("website") ? `Sent from the website (${leadSourceLabel[data.source as keyof typeof leadSourceLabel].toLowerCase()})` : "Added by the team" };
    case "request":
      return { icon: Globe, text: "Asked again from the website; the request above is the latest" };
    case "note":
      return { icon: MessageSquareText, text: "Note" };
    case "status":
      return { icon: ArrowRightLeft, text: `Moved from ${status(data.from)} to ${status(data.to)}` };
    case "assigned":
      return { icon: UserRound, text: data.to ? `${data.auto ? "Given in turn to" : "Handed to"} ${people.get(data.to)?.name ?? "a staff member"}` : "Taken off everyone's list" };
    case "follow_up":
      return { icon: CalendarClock, text: data.to ? `Follow-up set for ${shortDate(data.to)}${data.time ? ` at ${data.time.slice(0, 5)}` : ""}` : "Follow-up cleared" };
    case "booked":
      return { icon: ClipboardCheck, text: `Booked as ${data.number ?? "a booking"}` };
    case "call":
      return { icon: PhoneCall, text: "Phone call" };
    case "whatsapp":
      return { icon: MessageCircle, text: "WhatsApp" };
    case "email":
      return { icon: Mail, text: "Email" };
    case "meeting":
      return { icon: Users, text: "Meeting or site visit" };
    case "advance":
      return { icon: Banknote, text: `Advance of ${rupees(Number(data.amountPaise ?? 0))} taken` };
    case "quotation":
      return { icon: FileText, text: "Quotation written" };
    case "details":
      return { icon: Pencil, text: "Details changed" };
    case "merged":
      return { icon: Combine, text: "Merged a duplicate lead" };
    default:
      return { icon: Sparkles, text: type };
  }
}

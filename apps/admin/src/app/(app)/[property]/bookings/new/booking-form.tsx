"use client";

import { useActionState, useState, useTransition } from "react";
import { Calculator, ChevronDown, Minus, Plus, Trash2 } from "lucide-react";
import { FormNote } from "@/components/form-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { methodLabel, plural, price, rupees, shortDate, sourceLabel, offlineSources } from "@/lib/format";
import { createOffline, quoteOffline, type BookingRequest, type QuoteView } from "./actions";

/** A room type, or a ticket for a package, activity or sitting, that can be added. */
export type Option = { id: string; name: string; available: number; closedReason: string | null; maxAdults: number; maxGuests: number; extraBedAllowed: boolean };
type Band = { code: string; label: string };
type Line = { key: number; id: string; adults: number; children: Record<string, number>; extraBeds: number };

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1">
        <Button type="button" variant="outline" size="icon" className="size-8" aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus />
        </Button>
        <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <Button type="button" variant="outline" size="icon" className="size-8" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus />
        </Button>
      </span>
    </div>
  );
}

/** A step's number, so the form reads top to bottom: dates, rooms, guests, guest details, payment. */
export function Step({ n }: { n: number }) {
  return <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">{n}</span>;
}

const guestsIn = (line: Line) => line.adults + Object.values(line.children).reduce((sum, n) => sum + n, 0);

export function NewBookingForm({
  propertyId,
  kind,
  dates,
  options,
  bands,
  canOverride,
  canTakePayment,
}: {
  propertyId: string;
  kind: "stay" | "day";
  dates: { checkIn: string; checkOut: string } | { day: string };
  options: Option[];
  bands: Band[];
  canOverride: boolean;
  canTakePayment: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [quoting, startQuote] = useTransition();
  const [override, setOverride] = useState(false);
  const [payMethod, setPayMethod] = useState("none");
  const [payAmount, setPayAmount] = useState("");
  const [state, action, pending] = useActionState(createOffline.bind(null, propertyId), undefined);

  const noun = kind === "stay" ? "room" : "ticket";
  const optionOf = (id: string) => options.find((o) => o.id === id)!;
  const used = (id: string) => lines.filter((l) => l.id === id).length;
  // Any change to the rooms or guests makes a shown price out of date.
  const change = (next: Line[]) => {
    setLines(next);
    setQuote(null);
  };
  const update = (key: number, patch: Partial<Line>) => change(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const add = (option: Option) => {
    change([...lines, { key: nextKey, id: option.id, adults: Math.min(2, option.maxAdults), children: {}, extraBeds: 0 }]);
    setNextKey(nextKey + 1);
  };

  const request: BookingRequest =
    "day" in dates
      ? { kind: "day", day: dates.day, lines: lines.map(({ id, adults, children }) => ({ id, adults, children })) }
      : { kind: "stay", checkIn: dates.checkIn, checkOut: dates.checkOut, lines: lines.map(({ id, adults, children, extraBeds }) => ({ id, adults, children, extraBeds })) };

  return (
    <form action={action} className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <input type="hidden" name="request" value={JSON.stringify(request)} />
      <div className="grid min-w-0 content-start gap-4">
        <Card className="shadow-xs">
          <CardHeader className="flex items-center gap-3">
            <Step n={2} />
            <div className="grid gap-1.5">
              <CardTitle>{kind === "stay" ? "Rooms free for these dates" : "Tickets for this day"}</CardTitle>
              <CardDescription>{kind === "stay" ? "Add a room for each room the guest needs." : "Add each package, activity or sitting the guests want."}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground">{kind === "stay" ? "This resort has no room types on sale." : "This resort has no packages, activities or sittings on sale."}</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {options.map((option) => {
                  const left = option.available - (kind === "stay" ? used(option.id) : 0);
                  const blocked = option.closedReason ?? (option.available <= 0 ? (kind === "stay" ? "Sold out" : "Full") : kind === "day" && used(option.id) > 0 ? "Added" : left <= 0 ? "All free ones added" : null);
                  return (
                    <li key={option.id} className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors ${blocked ? "bg-muted/30" : "hover:border-primary/30 hover:bg-accent/40"} ${used(option.id) ? "border-primary/40 bg-primary/[0.03]" : ""}`}>
                      <div className="min-w-0">
                        <p className="font-medium">{option.name}</p>
                        <div className="mt-1">
                          {blocked ? (
                            <Badge variant="outline" className={option.available <= 0 || option.closedReason ? "border-danger/30 bg-danger/10 text-danger" : "text-muted-foreground"}>
                              {blocked}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-good/30 bg-good/10 text-good">
                              {kind === "stay" ? `${plural(left, "room")} free` : `${plural(option.available, "seat")} left`}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" disabled={Boolean(blocked)} onClick={() => add(option)} className="shrink-0">
                        <Plus />
                        Add {noun}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        {lines.length > 0 && (
          <Card className="shadow-xs">
            <CardHeader className="flex items-center gap-3">
              <Step n={3} />
              <div className="grid gap-1.5">
                <CardTitle>Who is coming</CardTitle>
                <CardDescription>Set the guests for each {noun}, then check the price.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {lines.map((line, index) => {
                const option = optionOf(line.id);
                const guests = guestsIn(line);
                return (
                  <div key={line.key} className="grid gap-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">
                        {kind === "stay" ? `Room ${index + 1}: ` : ""}
                        {option.name}
                      </p>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => change(lines.filter((l) => l.key !== line.key))}>
                        <Trash2 />
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:max-w-sm">
                      <Stepper label="Adults" value={line.adults} min={1} max={option.maxAdults} onChange={(adults) => update(line.key, { adults })} />
                      {bands.map((band) => (
                        <Stepper
                          key={band.code}
                          label={`Children, ${band.label}`}
                          value={line.children[band.code] ?? 0}
                          min={0}
                          max={option.maxGuests}
                          onChange={(n) => update(line.key, { children: { ...line.children, [band.code]: n } })}
                        />
                      ))}
                      {option.extraBedAllowed && <Stepper label="Extra beds" value={line.extraBeds} min={0} max={2} onChange={(extraBeds) => update(line.key, { extraBeds })} />}
                    </div>
                    {guests > option.maxGuests && (
                      <p className="text-sm text-destructive">{kind === "stay" ? `This room takes at most ${option.maxGuests} guests.` : `Only ${option.maxGuests} seats are left.`}</p>
                    )}
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" disabled={quoting} onClick={() => startQuote(async () => setQuote(await quoteOffline(propertyId, request)))}>
                  {quoting ? <Spinner /> : <Calculator />}
                  {quoting ? "Checking…" : "Check the price"}
                </Button>
                {quote?.error && (
                  <p role="status" className="text-sm text-destructive">
                    {quote.error}
                  </p>
                )}
              </div>
              {quote?.lines && (
                <div role="status" className="rounded-lg border">
                  <Table>
                    <TableBody>
                      {quote.lines.map((line, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-normal">
                            <span className="font-medium">{line.name}</span>
                            {line.nights.length > 0 && (
                              <span className="block text-xs text-muted-foreground">
                                {line.nights.map((n) => `${shortDate(n.night)} ${price(n.paise)}${n.source !== "base" ? ` (${n.source === "date" ? "date price" : n.source})` : ""}`).join(" · ")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right align-top tabular-nums">{price(line.totalPaise)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-semibold">Total</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{price(quote.totalPaise)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                  {quote.totalPaise === null && <p className="border-t p-3 text-xs text-muted-foreground">A rate these guests need is not published. Book now and set the price on the booking, or set it here.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>

      <div className="grid content-start gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="shadow-xs">
          <CardHeader className="flex items-center gap-3">
            <Step n={lines.length > 0 ? 4 : 3} />
            <CardTitle>Guest</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" name="name" required minLength={2} autoComplete="off" />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="98765 43210" />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="off" />
              </Field>
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <ChevronDown className="size-4" />
                  Company and GSTIN, for a company invoice
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 grid gap-3">
                  <Input name="companyName" aria-label="Company name" placeholder="Company name" />
                  <Input name="companyGstin" aria-label="Company GSTIN" placeholder="GSTIN" className="uppercase" />
                </CollapsibleContent>
              </Collapsible>
              <Field>
                <FieldLabel htmlFor="source">Booked by</FieldLabel>
                <Select name="source" defaultValue="phone">
                  <SelectTrigger id="source" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {offlineSources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {sourceLabel[source]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="notes">Notes for the team</FieldLabel>
                <Textarea id="notes" name="notes" rows={2} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {(canOverride || canTakePayment) && (
          <Card className="shadow-xs">
            <CardHeader className="flex items-center gap-3">
              <Step n={lines.length > 0 ? 5 : 4} />
              <CardTitle>Price and payment</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-5">
                {canOverride && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="override">Use a different price</Label>
                      <Switch id="override" name="override" checked={override} onCheckedChange={setOverride} />
                    </div>
                    {override && (
                      <div className="grid gap-3">
                        <Input name="overridePrice" required inputMode="decimal" aria-label="Price for the whole booking, in rupees" placeholder="Price for the whole booking (₹)" />
                        <Input name="overrideReason" required minLength={3} aria-label="Why the price is different" placeholder="Why, such as an agent rate" />
                      </div>
                    )}
                  </>
                )}
                {canTakePayment && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="payMethod">Payment taken now</FieldLabel>
                      {/* "None yet" sends nothing, so the booking waits for payment. */}
                      <input type="hidden" name="payMethod" value={payMethod === "none" ? "" : payMethod} />
                      <Select value={payMethod} onValueChange={setPayMethod}>
                        <SelectTrigger id="payMethod" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None yet</SelectItem>
                          {Object.entries(methodLabel).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>{payMethod !== "none" ? "Paid in full confirms the booking; less makes it part paid." : "Without a payment, the rooms are held for the resort's hold time, then go back on sale."}</FieldDescription>
                    </Field>
                    {payMethod !== "none" && (
                      <div className="grid gap-3">
                        <Input name="payAmount" required inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} aria-label="Amount paid, in rupees" placeholder="Amount paid (₹)" />
                        {quote?.totalPaise != null && !override && (
                          <Button type="button" variant="link" className="h-auto justify-self-start p-0" onClick={() => setPayAmount(String(quote.totalPaise! / 100))}>
                            The full {rupees(quote.totalPaise)}
                          </Button>
                        )}
                        <Input name="payReference" aria-label="Reference" placeholder="UPI, card or receipt reference" />
                      </div>
                    )}
                  </>
                )}
              </FieldGroup>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-2">
          <Button type="submit" size="lg" disabled={pending || lines.length === 0}>
            {pending && <Spinner />}
            {pending ? "Booking…" : "Create booking"}
          </Button>
          {lines.length === 0 && <p className="text-center text-xs text-muted-foreground">Add a {noun} to book.</p>}
          <FormNote state={state} />
        </div>
      </div>
    </form>
  );
}

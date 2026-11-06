"use client";

import { useState, useTransition } from "react";
import { Calculator, Plus, Save, Trash2 } from "lucide-react";
import { DateRangeField } from "@/components/date-field";
import { FormNote, useToastAction } from "@/components/form-note";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { plural, price, rupees } from "@/lib/format";
import { Stepper } from "../../new/booking-form";
import { previewStayChange, saveStayChange, type ChangeRequest, type ChangeView } from "./actions";

type RoomType = { id: string; name: string; maxAdults: number | null; maxGuests: number | null; extraBedAllowed: boolean };
type Band = { code: string; label: string };
type Line = { key: number; roomTypeId: string; adults: number; children: Record<string, number>; extraBeds: number };

const noLimit = 60;

/** Change a stay's dates, rooms and guests (BK-06): check the new price, give a reason, save. */
export function ChangeStayForm({
  bookingId,
  checkIn,
  checkOut,
  lines: start,
  roomTypes,
  bands,
  canKeepPrice,
  checkedIn,
}: {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  lines: Omit<Line, "key">[];
  roomTypes: RoomType[];
  bands: Band[];
  canKeepPrice: boolean;
  checkedIn: boolean;
}) {
  const [dates, setDates] = useState({ checkIn, checkOut });
  const [lines, setLines] = useState<Line[]>(start.map((line, i) => ({ ...line, key: i + 1 })));
  const [nextKey, setNextKey] = useState(start.length + 1);
  const [keepPrice, setKeepPrice] = useState(false);
  const [view, setView] = useState<ChangeView | null>(null);
  const [checking, startCheck] = useTransition();

  const request: ChangeRequest = { ...dates, keepPrice, rooms: lines.map(({ roomTypeId, adults, children, extraBeds }) => ({ roomTypeId, adults, children, extraBeds })) };
  const [state, action, pending] = useToastAction(saveStayChange.bind(null, bookingId));
  // Any change makes a shown price out of date.
  const change = (next: Line[]) => {
    setLines(next);
    setView(null);
  };
  const update = (key: number, patch: Partial<Line>) => change(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const typeOf = (id: string) => roomTypes.find((t) => t.id === id);
  const nights = Math.round((Date.parse(dates.checkOut) - Date.parse(dates.checkIn)) / 86_400_000);
  const due = view?.toPaise == null || view.paidPaise === undefined ? null : view.toPaise - view.paidPaise;

  return (
    <form action={action} className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <input type="hidden" name="request" value={JSON.stringify(request)} />
      <div className="grid min-w-0 gap-4">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Dates</CardTitle>
            <CardDescription>{checkedIn ? "The guest is checked in, so check-in stays. Change the check-out to add or take away nights." : "The new check-in and check-out."}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <DateRangeField
                id="change-dates"
                names={["checkIn", "checkOut"]}
                defaultValue={[checkIn, checkOut]}
                onChange={(from, to) => {
                  if (!from || !to) return;
                  setDates({ checkIn: checkedIn ? checkIn : from, checkOut: to });
                  setView(null);
                }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{plural(nights, "night")}.</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Rooms and guests</CardTitle>
            <CardDescription>Each room&apos;s type and who stays in it. A room may go to another room of its type: the engine takes the first free one.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {lines.map((line, index) => {
              const type = typeOf(line.roomTypeId);
              return (
                <div key={line.key} className="grid gap-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Select value={line.roomTypeId} onValueChange={(roomTypeId) => update(line.key, { roomTypeId, extraBeds: 0 })}>
                      <SelectTrigger className="w-full sm:w-72" aria-label={`Room ${index + 1} type`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lines.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => change(lines.filter((l) => l.key !== line.key))}>
                        <Trash2 />
                        Remove room
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:max-w-sm">
                    <Stepper label="Adults" value={line.adults} min={1} max={type?.maxAdults ?? noLimit} onChange={(adults) => update(line.key, { adults })} />
                    {bands.map((band) => (
                      <Stepper
                        key={band.code}
                        label={`Children, ${band.label}`}
                        value={line.children[band.code] ?? 0}
                        min={0}
                        max={type?.maxGuests ?? noLimit}
                        onChange={(n) => update(line.key, { children: { ...line.children, [band.code]: n } })}
                      />
                    ))}
                    {type?.extraBedAllowed && <Stepper label="Extra beds" value={line.extraBeds} min={0} max={2} onChange={(extraBeds) => update(line.key, { extraBeds })} />}
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="justify-self-start"
              onClick={() => {
                change([...lines, { key: nextKey, roomTypeId: lines[lines.length - 1]?.roomTypeId ?? roomTypes[0].id, adults: 2, children: {}, extraBeds: 0 }]);
                setNextKey(nextKey + 1);
              }}
            >
              <Plus />
              Add a room
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>The new price</CardTitle>
            <CardDescription>Check it before you save. Nothing changes until you do.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button type="button" variant="outline" disabled={checking} onClick={() => startCheck(async () => setView(await previewStayChange(bookingId, request)))}>
              {checking ? <Spinner /> : <Calculator />}
              {checking ? "Checking…" : "Check the new price"}
            </Button>
            {view?.error && (
              <p role="status" className="text-sm text-destructive">
                {view.error}
              </p>
            )}
            {view?.lines && (
              <div role="status" className="overflow-hidden rounded-lg border">
                <Table>
                  <TableBody>
                    {view.lines.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-normal">
                          <span className="font-medium">{line.name}</span>
                          <span className="block text-xs text-muted-foreground">{line.unit}</span>
                        </TableCell>
                        <TableCell className="text-right align-top tabular-nums">{price(line.totalPaise)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell>Was</TableCell>
                      <TableCell className="text-right tabular-nums">{price(view.fromPaise)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">New price</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{price(view.toPaise)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Paid so far</TableCell>
                      <TableCell className="text-right tabular-nums">{rupees(view.paidPaise ?? 0)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
                {due !== null && due !== 0 && (
                  <p className={`border-t p-3 text-sm font-medium ${due > 0 ? "text-warn" : "text-good"}`}>{due > 0 ? `${rupees(due)} to collect.` : `${rupees(-due)} paid more than the new price: refund it to the guest.`}</p>
                )}
              </div>
            )}
            {canKeepPrice && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="keep-price"
                  checked={keepPrice}
                  onCheckedChange={(checked) => {
                    setKeepPrice(checked === true);
                    setView(null);
                  }}
                />
                <Label htmlFor="keep-price" className="font-normal">
                  Keep the booking&apos;s current price
                </Label>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="grid gap-3">
            <Field>
              <FieldLabel htmlFor="change-reason">Why it is changing</FieldLabel>
              <Input id="change-reason" name="reason" required minLength={3} placeholder="Guest moved their trip by a week" />
              <FieldDescription>It goes on the booking&apos;s timeline.</FieldDescription>
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : <Save />}
              {pending ? "Saving…" : "Save the change"}
            </Button>
            <FormNote state={state} />
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

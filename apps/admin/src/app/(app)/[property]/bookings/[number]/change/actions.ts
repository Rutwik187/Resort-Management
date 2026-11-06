"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { bookings, getDb, properties } from "@repo/db";
import { changeStay, NotFoundError, quoteChange, type Quote } from "@repo/engine";
import { date, problem, type FormState } from "@/lib/forms";
import { audit, requirePermission } from "@/lib/staff";

const count = z.number().int().min(0).max(50);
const changeInput = z.object({
  checkIn: date("check-in date"),
  checkOut: date("check-out date"),
  rooms: z
    .array(z.object({ roomTypeId: z.uuid(), adults: count.min(1, "Each room needs at least one adult."), children: z.record(z.string().max(40), count), extraBeds: count.max(5) }))
    .min(1, "Keep at least one room.")
    .max(30),
  keepPrice: z.boolean().optional(),
});
export type ChangeRequest = z.input<typeof changeInput>;

/** What the price check shows: each room with its new unit and price, and the totals. */
export type ChangeView = {
  error?: string;
  fromPaise?: number | null;
  toPaise?: number | null;
  paidPaise?: number;
  lines?: { name: string; unit: string; totalPaise: number | null }[];
};

async function changeable(bookingId: string) {
  z.uuid().parse(bookingId);
  const [booking] = await getDb().select({ id: bookings.id, propertyId: bookings.propertyId, number: bookings.number }).from(bookings).where(eq(bookings.id, bookingId));
  if (!booking) throw new NotFoundError("That booking no longer exists.");
  return booking;
}

const rooms = (input: z.infer<typeof changeInput>) => input.rooms.map(({ roomTypeId, adults, children, extraBeds }) => ({ roomTypeId, party: { adults, children }, extraBeds }));
const linesOf = (quote: Quote) => quote.lines.flatMap((line) => (line.kind === "stay" ? [{ name: line.roomTypeName, unit: line.unitName, totalPaise: line.totalPaise }] : []));

/** The new price and rooms, as the engine would book them, without changing anything. */
export async function previewStayChange(bookingId: string, payload: ChangeRequest): Promise<ChangeView> {
  try {
    const booking = await changeable(bookingId);
    await requirePermission("bookings.modify", booking.propertyId);
    const input = changeInput.parse(payload);
    const result = await quoteChange(getDb(), { bookingId, checkIn: input.checkIn, checkOut: input.checkOut, rooms: rooms(input), keepPrice: input.keepPrice });
    return { fromPaise: result.fromPaise, toPaise: result.toPaise, paidPaise: result.paidPaise, lines: linesOf(result.quote) };
  } catch (error) {
    return { error: problem(error, "Your role can't change bookings at this resort.")?.error };
  }
}

/** Changes the stay (BK-06), then opens the booking again. */
export async function saveStayChange(bookingId: string, _state: FormState, form: FormData): Promise<FormState> {
  let path: string;
  try {
    const booking = await changeable(bookingId);
    const staff = await requirePermission("bookings.modify", booking.propertyId);
    const input = changeInput.parse(JSON.parse(String(form.get("request") ?? "{}")));
    if (input.keepPrice) await requirePermission("prices.manage", booking.propertyId);
    const reason = z.string().trim().min(3, "Say why the booking is changing.").max(500).parse(String(form.get("reason") ?? ""));
    const result = await changeStay(getDb(), { bookingId, checkIn: input.checkIn, checkOut: input.checkOut, rooms: rooms(input), keepPrice: input.keepPrice, reason, userId: staff.userId });
    await audit({ userId: staff.userId, propertyId: booking.propertyId, action: "booking.change", entity: "bookings", entityId: bookingId, before: { totalPaise: result.fromPaise }, after: { checkIn: input.checkIn, checkOut: input.checkOut, totalPaise: result.toPaise, reason } });
    const [property] = await getDb().select({ code: properties.code }).from(properties).where(eq(properties.id, booking.propertyId));
    path = `/${property.code.toLowerCase()}/bookings/${booking.number.toLowerCase()}?changed=1`;
    if (result.toPaise !== null && result.paidPaise > result.toPaise) path += `&refund=${result.paidPaise - result.toPaise}`;
  } catch (error) {
    if (error instanceof SyntaxError) return { error: "Check the dates and rooms again." };
    return problem(error, "Your role can't change bookings at this resort.");
  }
  redirect(path);
}

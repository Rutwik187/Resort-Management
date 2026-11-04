/*
 * Nights and days are yyyy-mm-dd strings, read as calendar dates. Every
 * calculation runs in UTC, so a server's time zone never moves a night.
 */

const utc = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(utc(value).getTime());

export function addDays(date: string, days: number) {
  const next = utc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** 0 for Sunday to 6 for Saturday. */
export const dayOfWeek = (date: string) => utc(date).getUTCDay();

/** Each night of a stay: check-in up to the night before check-out. */
export function nightsOf(checkIn: string, checkOut: string) {
  if (!isDate(checkIn) || !isDate(checkOut) || checkOut <= checkIn) throw new RangeError("Check-out must come after check-in.");
  const nights: string[] = [];
  for (let night = checkIn; night < checkOut; night = addDays(night, 1)) nights.push(night);
  return nights;
}

/** Today's date in India, for "no bookings in the past". */
export const todayInIndia = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);

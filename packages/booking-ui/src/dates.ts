/*
 * Dates are plain yyyy-mm-dd strings, read as calendar days. Every
 * calculation runs in UTC, so a guest's own time zone never shifts a day.
 */

const parts = (date: string) => date.split("-").map(Number) as [number, number, number];

const utc = (date: string) => {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d));
};

export function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(utc(value).getTime());
}

/** Today in India, as yyyy-mm-dd. */
export function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

export function addDays(date: string, days: number) {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Every night of a stay: each date from check-in up to the day before check-out. At most 30. */
export function nightsOf(checkIn: string, checkOut: string) {
  const nights: string[] = [];
  if (!isDate(checkIn) || !isDate(checkOut)) return nights;
  for (let night = checkIn; night < checkOut && nights.length < 30; night = addDays(night, 1)) nights.push(night);
  return nights;
}

/**
 * Friday and Saturday nights take the weekend rate. Every other night,
 * Sunday included, takes the weekday rate.
 */
export function isWeekendNight(date: string) {
  const day = utc(date).getUTCDay();
  return day === 5 || day === 6;
}

const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "Tue, 8 Dec" */
export const formatDay = (date: string) => dayFormat.format(utc(date));

/** "day pass" to "day passes", "room" to "rooms". */
export const pluralOf = (noun: string) => (/(s|x|ch|sh)$/.test(noun) ? `${noun}es` : `${noun}s`);

export const plural = (count: number, one: string, many = pluralOf(one)) => `${count} ${count === 1 ? one : many}`;

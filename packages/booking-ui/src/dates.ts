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
const shortFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** "Tue, 8 Dec" */
export const formatDay = (date: string) => dayFormat.format(utc(date));

/** "8 to 10 Dec", or "30 Nov to 2 Dec" across two months. */
export function formatRange(from: string, to: string) {
  const [, fromMonth, fromDay] = parts(from);
  const [, toMonth] = parts(to);
  return fromMonth === toMonth ? `${fromDay} to ${shortFormat.format(utc(to))}` : `${shortFormat.format(utc(from))} to ${shortFormat.format(utc(to))}`;
}

/** "2026-11-01": the first day of the date's month. */
export const monthOf = (date: string) => `${date.slice(0, 7)}-01`;

/** The first day of the month `count` months after the given date's month. */
export function addMonths(date: string, count: number) {
  const [y, m] = parts(date);
  return new Date(Date.UTC(y, m - 1 + count, 1)).toISOString().slice(0, 10);
}

/** The same day of the month in another month, or that month's last day when it is shorter. */
export function sameDayIn(month: string, date: string) {
  const [y, m] = parts(month);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month.slice(0, 8)}${String(Math.min(parts(date)[2], last)).padStart(2, "0")}`;
}

/** 0 for Sunday to 6 for Saturday. */
export const weekdayOf = (date: string) => utc(date).getUTCDay();

/** A month's days in weeks from Sunday to Saturday. Places before the 1st and after the last day are null. */
export function monthWeeks(month: string): (string | null)[][] {
  const [y, m] = parts(month);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: weekdayOf(month) }, () => null);
  for (let day = 1; day <= last; day++) cells.push(`${month.slice(0, 8)}${String(day).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const longFormat = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "November 2026" */
export const formatMonth = (date: string) => monthFormat.format(utc(date));

/** "Thursday, 12 November 2026", for screen readers. */
export const formatLong = (date: string) => longFormat.format(utc(date));

/** "day pass" to "day passes", "room" to "rooms". */
export const pluralOf = (noun: string) => (/(s|x|ch|sh)$/.test(noun) ? `${noun}es` : `${noun}s`);

export const plural = (count: number, one: string, many = pluralOf(one)) => `${count} ${count === 1 ? one : many}`;

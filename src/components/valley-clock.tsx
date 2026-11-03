"use client";

import { useSyncExternalStore } from "react";
import { contact } from "@/content/resort";

const IST = "Asia/Kolkata";
const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST });
const time = (ms: number) => timeFormat.format(ms).replace(/\s?([ap])\.?m\.?/i, " $1m").toLowerCase();

const rad = Math.PI / 180;

/**
 * Sunrise and sunset at the resort for the current calendar day in India,
 * from the standard sunrise equation (accurate to a minute or two).
 */
function sunTimes(now: number) {
  const { lat, lng } = contact.geo;
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(now).split("-").map(Number);
  const noonIST = Date.UTC(y, m - 1, d, 6, 30);
  const n = Math.round(noonIST / 86400000 + 2440587.5 - 2451545.0 + 0.0008);
  const meanSolar = n - lng / 360;
  const M = (357.5291 + 0.98560028 * meanSolar) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const transit = 2451545.0 + meanSolar + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);
  const sinDec = Math.sin(lambda * rad) * Math.sin(23.4397 * rad);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosHour = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * sinDec) / (Math.cos(lat * rad) * cosDec);
  const hourAngle = Math.acos(cosHour) / rad;
  const toMs = (julian: number) => (julian - 2440587.5) * 86400000;
  return { sunrise: toMs(transit - hourAngle / 360), sunset: toMs(transit + hourAngle / 360) };
}

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 15000);
  return () => window.clearInterval(timer);
}
// Snapshot to the minute, so the component re-renders only when the clock changes.
const minute = () => Math.floor(Date.now() / 60000);

/** "Now 4:12 pm. Sunrise 6:34 am. Sunset 6:02 pm." Rendered only in the browser. */
export function ValleyClock({ className = "" }: { className?: string }) {
  const now = useSyncExternalStore(subscribe, minute, () => null);
  if (now === null) return <dl className={className} aria-hidden />;
  const ms = now * 60000;
  const sun = sunTimes(ms);
  const items = [
    { label: "In the valley now", value: time(ms) },
    { label: "Sunrise today", value: time(sun.sunrise) },
    { label: "Sunset today", value: time(sun.sunset) },
  ];
  return (
    <dl className={className}>
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-6 lg:block">
          <dt className="label text-sage">{item.label}</dt>
          <dd className="display text-[1.7rem] leading-none tabular-nums lg:mt-2 lg:text-[clamp(1.8rem,2.6vw,2.6rem)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

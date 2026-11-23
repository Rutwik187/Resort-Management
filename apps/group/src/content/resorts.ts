import type { StaticImageData } from "next/image";
import { properties, type Property } from "@repo/sites";
import gc from "@/assets/gc.jpg";
import ks from "@/assets/ks.jpg";
import pv from "@/assets/pv.jpg";
import sb from "@/assets/sb.jpg";

/** Each resort's photo on the group site. */
export const photos: Record<string, { src: StaticImageData; alt: string }> = {
  KS: { src: ks, alt: "The pool at Prathamesh Resorts, Khed Shivapur, from above" },
  GC: { src: gc, alt: "The wide pool at Prathamesh Go Crazy, Sinhagad" },
  SB: { src: sb, alt: "A cottage at Sinhagad Bliss in March" },
  PV: { src: pv, alt: "The hills around Prathamesh Valley Resorts, Mahabaleshwar" },
};

export const resorts: Property[] = properties;
export const resortOf = (code: string) => properties.find((p) => p.code === code);
export const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

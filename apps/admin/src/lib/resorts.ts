import type { StaticImageData } from "next/image";
import gc from "@/assets/resorts/gc.jpg";
import ks from "@/assets/resorts/ks.jpg";
import pv from "@/assets/resorts/pv.jpg";
import sb from "@/assets/resorts/sb.jpg";

/**
 * Each resort's photo for its card and the resort menu: its own grounds,
 * from its website (Khed Shivapur's pool, Go Crazy's pool, a Sinhagad Bliss
 * cottage, and Valley's cottages from the air).
 */
export const resortPhoto: Record<string, StaticImageData> = { KS: ks, GC: gc, SB: sb, PV: pv };

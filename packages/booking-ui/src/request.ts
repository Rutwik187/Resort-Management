import { formatRupees } from "./pricing";
import type { Desk } from "./types";

/** One line of the guest's selection, as the tray shows it and the message sends it. */
export type RequestLine = { key: string; title: string; detail: string; amount: number | null };

export type GuestDetails = { name: string; phone: string; note: string };

/**
 * A request as the site keeps it, besides the WhatsApp message: what the
 * guest chose, when, the estimate and their details. Sites pass a server
 * action that saves it as a lead in the admin.
 */
export type WebsiteRequest = {
  kind: "stay" | "day";
  /** Check-in for a stay; the date of a day visit. yyyy-mm-dd. */
  from: string;
  /** Check-out, for a stay. */
  to?: string;
  /** Everyone coming, babies included. */
  guests: number;
  lines: { title: string; detail: string; amount: number | null }[];
  /** Null when a line has no published rate. */
  total: number | null;
  guest: GuestDetails;
};

/**
 * The booking request as a WhatsApp message. It lists what the guest chose,
 * the estimate and their details, so the team can confirm in one reply.
 */
export function requestMessage({
  desk,
  opening,
  when,
  lines,
  total,
  guest,
}: {
  desk: Desk;
  opening: string;
  when: string[];
  lines: RequestLine[];
  total: number | null;
  guest: GuestDetails;
}) {
  return [
    `Hello ${desk.resortName}, ${opening}`,
    ...when,
    "",
    ...lines.map((line, i) => `${i + 1}. ${line.title}: ${line.detail}${line.amount === null ? " (rate to confirm)" : `, ${formatRupees(line.amount)}`}`),
    total === null ? "Estimate: to confirm" : `Estimate: ${formatRupees(total)} plus GST`,
    "",
    `Name: ${guest.name}`,
    `Phone: ${guest.phone}`,
    guest.note ? `Note: ${guest.note}` : "",
  ]
    .filter((line, i, all) => line !== "" || (i > 0 && all[i - 1] !== ""))
    .join("\n")
    .trim();
}

export function openWhatsApp(number: string, text: string) {
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

/** Hands a sent request to the site, if it keeps them. A failure is logged, never shown: WhatsApp already has the request. */
export function keep(onRequest: ((request: WebsiteRequest) => Promise<unknown> | void) | undefined, request: WebsiteRequest) {
  if (!onRequest) return;
  try {
    Promise.resolve(onRequest(request)).catch((error) => console.error("The request wasn't kept.", error));
  } catch (error) {
    console.error("The request wasn't kept.", error);
  }
}

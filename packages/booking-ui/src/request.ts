import { formatRupees } from "./pricing";
import type { Desk } from "./types";

/** One line of the guest's selection, as the tray shows it and the message sends it. */
export type RequestLine = { key: string; title: string; detail: string; amount: number | null };

export type GuestDetails = { name: string; phone: string; note: string };

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

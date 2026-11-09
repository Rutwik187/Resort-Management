import type { Party } from "./types";

/*
 * Booking and paying on the website (docs/implementation-plan.md, section
 * 10: booking steps 4 to 8). The widget only describes the guest's choice
 * by its listings' codes; the site's server actions hold, price and charge
 * it through the engine. A site that passes no `online` keeps the WhatsApp
 * request.
 */

/** What the guest chose, by the codes the listings, passes and add-ons carry. */
export type OnlineChoice = (
  | { kind: "stay"; checkIn: string; checkOut: string; rooms: { code: string; party: Party }[] }
  | { kind: "day"; date: string; passes: { code: string; party: Party }[] }
) & { addons?: { code: string; quantity: number }[] };

/** Something extra the guest can add before paying (PR-06), priced before GST. */
export type OnlineAddon = { code: string; name: string; summary: string | null; basis: "unit" | "person" | "night"; pricePaise: number; maxQuantity: number };

export const addonPer = { unit: "each", person: "a person", night: "a night" } as const;

/** The add-ons the guest chose, with how many, in the resort's order. */
export const chosenAddons = (addons: readonly OnlineAddon[], counts: Record<string, number>) =>
  addons.filter((a) => (counts[a.code] ?? 0) > 0).map((a) => ({ code: a.code, quantity: Math.min(a.maxQuantity, counts[a.code]) }));

/** What the chosen add-ons cost before GST, in rupees. A per-night one counts every night. */
export function addonsRupees(addons: readonly OnlineAddon[], counts: Record<string, number>, nights: number) {
  return chosenAddons(addons, counts).reduce((sum, { code, quantity }) => {
    const addon = addons.find((a) => a.code === code)!;
    return sum + (addon.pricePaise / 100) * quantity * (addon.basis === "night" ? nights : 1);
  }, 0);
}

export type OnlineGuest = {
  name: string;
  phone: string;
  email: string;
  companyName: string;
  companyGstin: string;
  note: string;
  marketing: boolean;
  acceptedTerms: boolean;
};

/** Razorpay's checkout, as the server opened it. */
export type CheckoutOrder = { keyId: string; orderId: string; amountPaise: number; mode: "test" | "live"; number: string; resortName: string };

/** The held, priced booking, for the guest to review before paying. */
export type OnlineStarted = {
  number: string;
  /** The guest's private booking page. */
  url: string;
  holdExpiresAt: string;
  lines: { title: string; amountPaise: number | null }[];
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  dueNowPaise: number;
  checkout: CheckoutOrder;
};

export type PaymentAnswer = { orderId: string; paymentId: string; signature: string };

export type StartResult = { ok: true; started: OnlineStarted } | { ok: false; error: string; whatsapp?: boolean };
export type ConfirmResult = { ok: true } | { ok: false; error: string };

/** The site's server actions for booking online. */
export type OnlineBooking = {
  start: (choice: OnlineChoice, guest: OnlineGuest) => Promise<StartResult>;
  confirm: (answer: PaymentAnswer) => Promise<ConfirmResult>;
  /** The page with the booking terms and cancellation rules. */
  termsHref: string;
  /** The resort's add-ons for this kind of booking, shown in the tray. */
  addons?: OnlineAddon[];
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  order_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; contact?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
};
type RazorpayCheckout = { open: () => void; on: (event: "payment.failed", fn: (response: { error: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

let loading: Promise<void> | null = null;

/** Loads Razorpay's checkout script once. */
export function loadRazorpay() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("The payment window didn't load. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return loading;
}

/**
 * Opens Razorpay's checkout for an order. Resolves with the signed answer
 * once paid. A failed try leaves the window open for another; when the
 * guest closes it, it resolves with the last failure, if any.
 */
export async function payWithRazorpay(order: CheckoutOrder, prefill: { name?: string; phone?: string; email?: string }): Promise<PaymentAnswer | { closed: true; error: string | null }> {
  await loadRazorpay();
  let lastError: string | null = null;
  return new Promise((resolve) => {
    const checkout = new window.Razorpay!({
      key: order.keyId,
      amount: order.amountPaise,
      currency: "INR",
      order_id: order.orderId,
      name: order.resortName,
      description: `Booking ${order.number}`,
      prefill: { name: prefill.name, contact: prefill.phone ? `+${prefill.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}` : undefined, email: prefill.email || undefined },
      notes: { booking: order.number },
      handler: (response) => resolve({ orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }),
      modal: { ondismiss: () => resolve({ closed: true, error: lastError }) },
    });
    checkout.on("payment.failed", (response) => {
      lastError = response.error.description ?? "The payment didn't go through.";
    });
    checkout.open();
  });
}

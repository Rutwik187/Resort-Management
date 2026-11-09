/*
 * A thin Razorpay client over its REST API (https://razorpay.com/docs/api/).
 * No SDK: five calls are all we need. Tests pass their own `send`, so they
 * never reach Razorpay.
 */

export type RazorpayKeys = { keyId: string; keySecret: string };

export type RazorpaySend = (method: "GET" | "POST", path: string, body?: unknown) => Promise<unknown>;

export class RazorpayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "RazorpayError";
  }
}

/** Sends one request with the account's keys. Razorpay's error message is passed on. */
export function razorpaySender(keys: RazorpayKeys): RazorpaySend {
  const auth = `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64")}`;
  return async (method, path, body) => {
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { authorization: auth, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: { description?: string; code?: string } };
    if (!response.ok) throw new RazorpayError(data.error?.description ?? `Razorpay answered ${response.status}.`, response.status, data.error?.code);
    return data;
  };
}

export type RazorpayOrder = { id: string; amount: number; status: "created" | "attempted" | "paid" };
export type RazorpayPayment = { id: string; order_id: string | null; amount: number; status: "created" | "authorized" | "captured" | "refunded" | "failed"; method: string | null; error_description?: string | null };
export type RazorpayLink = { id: string; short_url: string; status: "created" | "partially_paid" | "expired" | "cancelled" | "paid"; payments?: { payment_id: string; amount: number; status: string; method?: string }[] | null };
export type RazorpayRefund = { id: string; payment_id: string; amount: number; status: "pending" | "processed" | "failed" };

export const razorpay = (send: RazorpaySend) => ({
  createOrder: (input: { amount: number; receipt: string; notes?: Record<string, string> }) =>
    send("POST", "/orders", { amount: input.amount, currency: "INR", receipt: input.receipt, notes: input.notes }) as Promise<RazorpayOrder>,
  orderPayments: async (orderId: string) => ((await send("GET", `/orders/${orderId}/payments`)) as { items: RazorpayPayment[] }).items,
  payment: (paymentId: string) => send("GET", `/payments/${paymentId}`) as Promise<RazorpayPayment>,
  capture: (paymentId: string, amount: number) => send("POST", `/payments/${paymentId}/capture`, { amount, currency: "INR" }) as Promise<RazorpayPayment>,
  createLink: (input: {
    amount: number;
    description: string;
    reference: string;
    customer: { name: string; contact?: string; email?: string };
    expireBy?: number;
    notes?: Record<string, string>;
  }) =>
    send("POST", "/payment_links", {
      amount: input.amount,
      currency: "INR",
      accept_partial: false,
      description: input.description,
      reference_id: input.reference,
      customer: input.customer,
      notify: { sms: Boolean(input.customer.contact), email: Boolean(input.customer.email) },
      reminder_enable: true,
      expire_by: input.expireBy,
      notes: input.notes,
    }) as Promise<RazorpayLink>,
  link: (linkId: string) => send("GET", `/payment_links/${linkId}`) as Promise<RazorpayLink>,
  refund: (paymentId: string, input: { amount: number; receipt: string; notes?: Record<string, string> }) =>
    send("POST", `/payments/${paymentId}/refund`, { amount: input.amount, speed: "normal", receipt: input.receipt, notes: input.notes }) as Promise<RazorpayRefund>,
  refundStatus: (paymentId: string, refundId: string) => send("GET", `/payments/${paymentId}/refunds/${refundId}`) as Promise<RazorpayRefund>,
});

export type Razorpay = ReturnType<typeof razorpay>;

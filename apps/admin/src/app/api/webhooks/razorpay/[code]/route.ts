import { getDb } from "@repo/db";
import { handleRazorpayWebhook, NotFoundError, RuleError } from "@repo/engine";

/**
 * Razorpay's webhooks, one address per resort, since each company has its
 * own account and secret (docs/implementation-plan.md, section 6). The body
 * is read as text, because the signature covers the exact bytes.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/webhooks/razorpay/[code]">) {
  const code = (await params).code.toUpperCase();
  const body = await request.text();
  try {
    const result = await handleRazorpayWebhook(getDb(), {
      propertyCode: code,
      body,
      signature: request.headers.get("x-razorpay-signature"),
      eventId: request.headers.get("x-razorpay-event-id"),
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    // A bad signature or unknown resort is refused; Razorpay retries anything else.
    if (error instanceof RuleError || error instanceof NotFoundError) return Response.json({ error: error.message }, { status: 400 });
    console.error(`Razorpay webhook for ${code} failed.`, error);
    return Response.json({ error: "Not processed." }, { status: 500 });
  }
}

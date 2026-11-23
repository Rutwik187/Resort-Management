import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, messages } from "@repo/db";

/*
 * Resend's delivery reports (NOT-05): delivered, bounced, complained or
 * failed, recorded on the message so the booking and lead pages show what
 * happened. Resend signs each call the Svix way with RESEND_WEBHOOK_SECRET
 * (whsec_…); calls older than five minutes are refused.
 */

const outcomes: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delayed",
  "email.failed": "failed",
  "email.opened": "opened",
};

function verified(secret: string, id: string, timestamp: string, body: string, header: string) {
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return header.split(" ").some((part) => {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) return false;
    const given = Buffer.from(signature, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Not set up." }, { status: 503 });
  const body = await request.text();
  const id = request.headers.get("svix-id") ?? "";
  const timestamp = request.headers.get("svix-timestamp") ?? "";
  if (!verified(secret, id, timestamp, body, request.headers.get("svix-signature") ?? "")) return Response.json({ error: "Bad signature." }, { status: 401 });
  const event = JSON.parse(body) as { type?: string; created_at?: string; data?: { email_id?: string } };
  const outcome = event.type ? outcomes[event.type] : undefined;
  const providerId = event.data?.email_id;
  if (!outcome || !providerId) return Response.json({ ignored: true });
  const [message] = await getDb().select({ id: messages.id, delivery: messages.delivery }).from(messages).where(eq(messages.providerId, providerId));
  if (!message) return Response.json({ unknown: true });
  // An open after delivery doesn't hide a bounce; a later delivery report replaces a delay.
  if (outcome === "opened" && message.delivery && message.delivery !== "delivered") return Response.json({ kept: message.delivery });
  await getDb()
    .update(messages)
    .set({ delivery: outcome, deliveryAt: event.created_at ? new Date(event.created_at) : new Date(), ...(outcome === "bounced" || outcome === "failed" ? { status: "failed" as const, error: `Resend: ${outcome}` } : {}) })
    .where(eq(messages.id, message.id));
  return Response.json({ recorded: outcome });
}

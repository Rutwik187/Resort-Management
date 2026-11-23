import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/*
 * Meta's Conversions API (TRK-02): the server tells Meta about a purchase
 * or a lead, with the same event id as the browser's Pixel, so Meta counts
 * it once. It goes only when the guest agreed to marketing, and only on a
 * site with META_PIXEL_ID and META_CAPI_TOKEN. Contact details are sent
 * hashed, as Meta asks. A failure is logged and never reaches the guest.
 */

const hash = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

export async function sendMetaEvent(event: { name: "Purchase" | "Lead"; eventId: string; value?: number; email?: string | null; phone?: string | null; url?: string; category?: string }) {
  const pixel = process.env.META_PIXEL_ID?.trim();
  const token = process.env.META_CAPI_TOKEN?.trim();
  if (!pixel || !token) return;
  try {
    const head = await headers();
    const digits = event.phone?.replace(/\D/g, "");
    const body = {
      data: [
        {
          event_name: event.name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: event.eventId,
          action_source: "website",
          event_source_url: event.url ?? head.get("referer") ?? undefined,
          user_data: {
            em: event.email ? [hash(event.email)] : undefined,
            ph: digits ? [hash(digits.length === 10 ? `91${digits}` : digits)] : undefined,
            client_ip_address: head.get("x-real-ip") ?? head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
            client_user_agent: head.get("user-agent") ?? undefined,
          },
          custom_data: { currency: "INR", value: event.value, content_category: event.category },
        },
      ],
    };
    const response = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error(`Meta's Conversions API answered ${response.status} for ${event.name}.`);
  } catch (error) {
    console.error("Meta's Conversions API call failed.", error);
  }
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "@repo/db";
import { recordWebsiteLead, sendQueuedEmails, type LeadInterest } from "@repo/engine";

export const maxDuration = 30;

/*
 * Meta (Facebook and Instagram) lead ads (URD 7.5 lead sources, CRM-03).
 * Meta calls this when someone fills a lead form; the lead is fetched from
 * the Graph API and saved as a lead, assigned and alerted like a website
 * enquiry. Settings:
 *   META_VERIFY_TOKEN   the token typed into Meta's webhook setup
 *   META_APP_SECRET     signs each call (X-Hub-Signature-256)
 *   META_PAGE_TOKEN     a page access token with leads_retrieval
 *   META_LEAD_FORMS     which resort and kind each form is for, as JSON:
 *                       {"<form id>": "KS:wedding", "default": "KS:wedding"}
 * Without them nothing is accepted.
 */

/** Meta's check when the webhook is set up: echo the challenge for the right token. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = process.env.META_VERIFY_TOKEN;
  if (token && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === token) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Not allowed.", { status: 403 });
}

type LeadgenChange = { field: string; value: { leadgen_id: string; form_id?: string; page_id?: string; ad_id?: string; campaign_id?: string } };
type Payload = { object?: string; entry?: { changes?: LeadgenChange[] }[] };
type GraphLead = { id: string; created_time?: string; field_data?: { name: string; values: string[] }[]; campaign_name?: string; ad_name?: string; form_id?: string };

const interests: LeadInterest[] = ["stay", "day", "wedding", "corporate", "event", "other"];

function target(formId: string | undefined): { code: string; interest: LeadInterest } | null {
  let map: Record<string, string> = {};
  try {
    map = JSON.parse(process.env.META_LEAD_FORMS ?? "{}");
  } catch {
    return null;
  }
  const [code, interest] = (map[formId ?? ""] ?? map.default ?? "").split(":");
  if (!["KS", "GC", "SB", "PV"].includes(code)) return null;
  return { code, interest: interests.includes(interest as LeadInterest) ? (interest as LeadInterest) : "wedding" };
}

/** One answer from the form by the usual field names, such as full_name or phone_number. */
const answer = (lead: GraphLead, ...names: string[]) => lead.field_data?.find((f) => names.includes(f.name.toLowerCase()))?.values?.[0]?.trim() || undefined;

export async function POST(request: Request) {
  const secret = process.env.META_APP_SECRET;
  const pageToken = process.env.META_PAGE_TOKEN;
  if (!secret || !pageToken) return Response.json({ error: "Not set up." }, { status: 503 });
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return Response.json({ error: "Bad signature." }, { status: 401 });

  const payload = JSON.parse(body) as Payload;
  const db = getDb();
  let saved = 0;
  for (const change of (payload.entry ?? []).flatMap((e) => e.changes ?? [])) {
    if (change.field !== "leadgen") continue;
    const where = target(change.value.form_id);
    if (!where) {
      console.error(`Meta lead ${change.value.leadgen_id} is from form ${change.value.form_id}, which META_LEAD_FORMS doesn't name.`);
      continue;
    }
    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(change.value.leadgen_id)}?fields=created_time,field_data,campaign_name,ad_name,form_id&access_token=${encodeURIComponent(pageToken)}`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Graph API answered ${response.status}.`);
      const lead = (await response.json()) as GraphLead;
      const name = answer(lead, "full_name", "name", "first_name") ?? "Meta lead";
      const phone = answer(lead, "phone_number", "phone", "mobile") ?? "";
      const known = new Set(["full_name", "name", "first_name", "phone_number", "phone", "mobile", "email"]);
      const details = Object.fromEntries((lead.field_data ?? []).filter((f) => !known.has(f.name.toLowerCase())).map((f) => [f.name.replace(/_/g, " "), f.values.join(", ")]));
      await recordWebsiteLead(db, {
        propertyCode: where.code,
        source: "meta_ads",
        interest: where.interest,
        name,
        phone,
        email: answer(lead, "email"),
        details,
        campaign: Object.fromEntries(Object.entries({ utm_source: "meta", utm_medium: "lead_ad", utm_campaign: lead.campaign_name ?? change.value.campaign_id, utm_content: lead.ad_name ?? change.value.ad_id }).filter(([, v]) => v)) as Record<string, string>,
      });
      saved++;
    } catch (error) {
      console.error(`Meta lead ${change.value.leadgen_id} wasn't saved.`, error);
    }
  }
  // Alerts go at once, so the executive hears within a minute (CRM-03).
  if (saved) await sendQueuedEmails(db, { limit: 20 }).catch(() => undefined);
  return Response.json({ saved });
}

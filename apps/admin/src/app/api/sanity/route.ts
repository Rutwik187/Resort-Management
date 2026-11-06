import { properties } from "@repo/sites";
import { isValidSignature, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { refreshWebsite } from "@/lib/website";

/*
 * Sanity's webhook calls this when an editor publishes, changes or deletes a
 * blog post, an FAQ, a policies page, an author or a category
 * (docs/implementation-plan.md, section 11). The admin then asks the
 * resort's website to drop its cached Sanity content. Authors and categories
 * belong to no resort, so all four refresh. The webhook signs each call
 * with SANITY_WEBHOOK_SECRET; the proxy lets it through without a session.
 */
export async function POST(request: Request) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "SANITY_WEBHOOK_SECRET isn't set." }, { status: 503 });
  const body = await request.text();
  const signature = request.headers.get(SIGNATURE_HEADER_NAME);
  if (!signature || !(await isValidSignature(body, signature, secret))) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }
  let resort: unknown;
  try {
    resort = (JSON.parse(body) as { resort?: unknown }).resort;
  } catch {
    return Response.json({ error: "The body isn't JSON." }, { status: 400 });
  }
  const codes = properties.map((p) => p.code).filter((code) => !resort || code === resort);
  const results = await Promise.all(codes.map(async (code) => ({ code, ...(await refreshWebsite(code, "content")) })));
  for (const r of results) if (!r.ok) console.error(`The ${r.code} website didn't refresh its Sanity content: ${r.reason}`);
  return Response.json({ refreshed: results.filter((r) => r.ok).map((r) => r.code), failed: results.filter((r) => !r.ok) });
}

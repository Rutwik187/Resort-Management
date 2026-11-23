import { revalidateTag } from "next/cache";
import { catalogueTag } from "@repo/website";
import { revalidateContent } from "@repo/sanity";

/**
 * The admin calls this, with the shared secret, after staff change any
 * resort's rooms, rates, offers or reviews (?code=KS), or a resort's blog
 * (?code=KS&scope=content). The group site shows all four, so it refreshes
 * whichever resort changed.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed." }, { status: 401 });
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.toUpperCase();
  if (code !== "KS" && code !== "GC" && code !== "SB" && code !== "PV") return Response.json({ error: "Which resort?" }, { status: 400 });
  if (url.searchParams.get("scope") === "content") revalidateContent(code);
  else revalidateTag(catalogueTag(code), { expire: 0 });
  return Response.json({ revalidated: code });
}

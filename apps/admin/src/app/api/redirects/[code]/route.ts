import { asc, eq } from "drizzle-orm";
import { getDb, properties, redirects } from "@repo/db";

/**
 * A resort's redirects from the admin (SEO-04, SEO-07), for its website to
 * read when it builds. Redirects aren't secret: they are what the site
 * answers anyway. Each site turns them into permanent redirects.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/redirects/[code]">) {
  const code = (await params).code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return Response.json([], { status: 404 });
  const db = getDb();
  const [property] = await db.select({ id: properties.id }).from(properties).where(eq(properties.code, code));
  if (!property) return Response.json([], { status: 404 });
  const rows = await db.select({ source: redirects.fromPath, destination: redirects.toPath }).from(redirects).where(eq(redirects.propertyId, property.id)).orderBy(asc(redirects.fromPath));
  return Response.json(rows, { headers: { "cache-control": "no-store" } });
}

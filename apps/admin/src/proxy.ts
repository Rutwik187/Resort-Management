import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * A quick check before any page renders: no session cookie, so go and sign
 * in. This only reads the cookie. Every page and action still checks the
 * person and their permissions on the server (src/lib/staff.ts).
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request, { cookiePrefix: "prathamesh-admin" })) return NextResponse.next();
  const signIn = new URL("/sign-in", request.url);
  if (request.nextUrl.pathname !== "/") signIn.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/((?!api/auth|api/sanity|api/webhooks|api/cron|sign-in|_next/|favicon.ico|icon.png).*)"],
};

import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@repo/auth";

// Better Auth's sign-in, callback and sign-out endpoints. Made on first request, so a build needs no database.
export async function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}

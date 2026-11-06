import { revalidateRoute } from "@repo/website";

/** The admin calls this, with the shared secret, after staff change this resort's rooms, rates or packages. */
export const POST = revalidateRoute("SB");

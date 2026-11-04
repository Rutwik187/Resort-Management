"use client";

import { adminClient, magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Sign-in and sign-out in the admin's browser code. It talks to the admin's own /api/auth route. */
export const authClient = createAuthClient({ plugins: [adminClient(), magicLinkClient()] });

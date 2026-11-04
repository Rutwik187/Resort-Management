import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { magicLink } from "better-auth/plugins/magic-link";
import { account, auditLog, getDb, rateLimit, session, staffMembers, user, verification, type Database } from "@repo/db";
import { eq } from "drizzle-orm";

/*
 * Staff sign-in for the admin (docs/implementation-plan.md, section 7, and
 * the URD's USR-01 to USR-07):
 * - Google only, and only for people a Super Admin has added. Google can't
 *   create new accounts; an added person's Google account links on first use.
 * - Every sign-in checks the staff list, so a removed or deactivated person
 *   can't start a session.
 * - A session ends after 12 hours without use. Its cookie cache lasts 5
 *   minutes, so a deactivated person is signed out within 5 minutes.
 * - Sign-in rate limits are counted in the database.
 * - On a developer's machine, an emailed sign-in link (printed to the
 *   terminal) also works, for people already on the staff list.
 */

const twelveHours = 60 * 60 * 12;
const isLocal = process.env.NODE_ENV !== "production";

function options(db: Database) {
  const google =
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            disableImplicitSignUp: true,
            prompt: "select_account" as const,
            // Set when the client uses Google Workspace, to allow only the company domain (USR-07).
            ...(process.env.GOOGLE_WORKSPACE_DOMAIN ? { hd: process.env.GOOGLE_WORKSPACE_DOMAIN } : {}),
          },
        }
      : undefined;

  return {
    appName: "Prathamesh admin",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification, rateLimit } }),
    emailAndPassword: { enabled: false },
    socialProviders: google,
    account: {
      // An added person signs in with Google for the first time: link it to their staff record.
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    session: {
      expiresIn: twelveHours,
      updateAge: 60 * 15,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/social": { window: 60, max: 10 },
        "/sign-in/magic-link": { window: 60, max: 5 },
      },
    },
    advanced: { cookiePrefix: "prathamesh-admin" },
    // A refused Google sign-in comes back to the sign-in page, which explains it (the error is added to the address).
    onAPIError: { errorURL: "/sign-in" },
    databaseHooks: {
      session: {
        create: {
          // Only active staff may hold a session (USR-02, USR-03).
          before: async (newSession) => {
            const [member] = await db
              .select({ active: staffMembers.active })
              .from(staffMembers)
              .where(eq(staffMembers.userId, newSession.userId));
            if (!member?.active) {
              throw new APIError("FORBIDDEN", { message: "This account is not on the staff list. Ask your Super Admin to add you." });
            }
          },
          // Every sign-in goes in the audit log (USR-05).
          after: async (created) => {
            await db.insert(auditLog).values({
              userId: created.userId,
              ip: created.ipAddress ?? null,
              action: "auth.sign_in",
              entity: "session",
              entityId: created.id,
            });
          },
        },
      },
    },
    plugins: [
      // Banning keeps a deactivated person out and ends their sessions.
      admin(),
      ...(isLocal
        ? [
            magicLink({
              disableSignUp: true,
              // No link for anyone who isn't active staff. The screen says the same either way, so it doesn't reveal who is.
              sendMagicLink: async ({ email, url }) => {
                const [member] = await db
                  .select({ active: staffMembers.active })
                  .from(staffMembers)
                  .innerJoin(user, eq(user.id, staffMembers.userId))
                  .where(eq(user.email, email.toLowerCase()));
                if (!member?.active) {
                  console.log(`\n  No sign-in link sent: ${email} is not active staff.\n`);
                  return;
                }
                console.log(`\n  Sign-in link for ${email} (development only):\n  ${url}\n`);
              },
            }),
          ]
        : []),
      // Lets server actions set the session cookie. Must come last.
      nextCookies(),
    ],
  } satisfies BetterAuthOptions;
}

function create(db: Database) {
  return betterAuth(options(db));
}

export type Auth = ReturnType<typeof create>;

let shared: Auth | undefined;

/** The admin's Better Auth instance, made on first use so builds don't need a database. */
export function getAuth(): Auth {
  shared ??= create(getDb());
  return shared;
}

# Prathamesh Group

The resort websites and the admin dashboard of the Prathamesh Group. This repository is a monorepo: it holds the apps and the packages they share. [Turborepo](https://turborepo.dev) runs the tasks and caches their results. [pnpm](https://pnpm.io) installs the dependencies.

The plan for the whole platform is in [`docs/implementation-plan.md`](docs/implementation-plan.md).

## What is where

| Folder | Package | What it holds |
|---|---|---|
| `apps/khed-shivapur` | `khed-shivapur` | Prathamesh Resorts, Khed Shivapur: prathameshresorts.com |
| `apps/go-crazy` | `go-crazy` | Prathamesh Go Crazy Resort, Sinhagad: gocrazyadventure.com |
| `apps/sinhagad-bliss` | `sinhagad-bliss` | Sinhagad Bliss: sinhagadbliss.com |
| `apps/valley` | `valley` | Prathamesh Valley Resorts, Mahabaleshwar: prathameshvalleyresorts.com |
| `apps/admin` | `admin` | The staff dashboard, built with shadcn/ui: sign-in, each resort's day (arrivals, sales, rooms booked), bookings with offline booking and the front desk, leads from the websites, the inventory calendar, rooms (with their website text), prices, packages, settings, staff and the audit log. Runs at http://localhost:3010 |
| `packages/booking-ui` | `@repo/booking-ui` | The booking widget that all four sites share: the search bar, the room and day-pass lists, and the tray |
| `packages/db` | `@repo/db` | The database: Drizzle tables, migrations, the seed, and the roles and permissions |
| `packages/auth` | `@repo/auth` | Staff sign-in with Better Auth, and the permission check `can()` |
| `packages/engine` | `@repo/engine` | The booking engine: availability, holds, prices, bookings and blocks, with its tests |
| `packages/sites` | `@repo/sites` | The group's four resorts: names, places, website addresses and the sections of each Stays page |
| `packages/website` | `@repo/website` | What the sites read from the admin: their rooms, rates and day packages (cached until the admin says they changed), and the requests they keep as leads |
| `packages/typescript-config` | `@repo/typescript-config` | The TypeScript settings that every package extends |
| `packages/eslint-config` | `@repo/eslint-config` | The ESLint rules that every package uses |

## Set up

You need Node.js 20.9 or later, and pnpm.

```sh
npm install --global pnpm
pnpm install
```

The root `package.json` pins pnpm 12.16.1. pnpm 10 and later switch to that version by themselves.

## Commands

Run these from the repository root. Turborepo runs the task in every package that has it.

| Command | What it does |
|---|---|
| `pnpm dev` | Starts the four sites in development mode: Khed Shivapur at http://localhost:3000, Go Crazy at :3001, Sinhagad Bliss at :3002 and Valley at :3003 |
| `pnpm build` | Checks the types, then builds the apps |
| `pnpm lint` | Checks the code with ESLint |
| `pnpm typecheck` | Checks the TypeScript types |
| `pnpm test` | Runs the engine's tests. They make their own Postgres databases (see Database below) |

When a task's files have not changed since the last run, Turborepo skips the task and replays the saved result.

To run a task in one app only, add a filter, for example `pnpm dev --filter=khed-shivapur`.

Add each dependency to the package that uses it, for example `pnpm add lenis --filter=khed-shivapur`. The root `package.json` holds only tools for the whole repository, such as `turbo`.

Turborepo passes a task only the environment variables that `turbo.json` lists. When code reads a new variable, add it to the task's `env` list. ESLint reports any variable that is missing.

## Database and sign-in

The database is Neon Postgres: project `withered-fire-71704216`, branch `production`, in Singapore. The resort sites, the admin and the engine share it. Drizzle writes the tables, and node-postgres (`pg`) talks to Neon, as Neon advises for Vercel. On Vercel, `attachDatabasePool` closes idle connections before a function suspends.

Neon gives two addresses for the same database:

- `DATABASE_URL`, the pooled address (its host ends in `-pooler`), for the apps.
- `DATABASE_URL_UNPOOLED`, the direct address, for migrations and the seed.

Use `sslmode=verify-full` in both.

Staff sign in with Better Auth, run by the admin itself. Its tables are in the `public` schema next to ours. The branch also has Neon Auth (Neon's managed Better Auth, in the `neon_auth` schema), which the admin does not use: managed auth can't check the staff list before a session starts.

**To work on the backend**

1. Copy `.env.example` at the repo root to `.env.local` and fill it in: the two addresses and a `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). Every app and script reads this one file, and git ignores it. Next.js reads env files only in an app's own folder, so the admin's `next.config.ts` loads the root file. Keep no other `.env` files.
2. From `packages/db`: `pnpm db:migrate`, then `pnpm db:seed`. The seed adds the four resorts, the five roles from the URD and the main site's rooms. With `SEED_SUPER_ADMIN_EMAIL` set, it also adds the first Super Admin. Then `pnpm db:import-sites` brings each website's rooms, rates and day packages from its `src/content/booking.ts` into the admin. It only adds what is missing and fills website text that is still empty, so it is safe to run again.
3. `pnpm dev --filter=admin`, then open http://localhost:3010. Without Google keys, the sign-in page offers an emailed link, printed in the terminal, to people on the staff list.

A variable set in the shell wins over the file. To work on a local database instead of Neon, start the command with `DATABASE_URL=postgresql://localhost:5432/prathamesh_dev`, for example `DATABASE_URL=postgresql://localhost:5432/prathamesh_dev pnpm db:migrate`. `pnpm db:reset` recreates a local database; it refuses any other.

The engine's tests need a local Postgres, which they reach at `TEST_DATABASE_ADMIN_URL` (by default `postgresql://localhost:5432/postgres`). Each test file makes its own database and drops it.

## Booking

Every site books with the shared widget in `packages/booking-ui`, the way MakeMyTrip does it. The guest chooses dates, rooms and guests, adds a room and says who stays in it, then adds other rooms of any type. A bar under the site header names every room type and jumps to it. Adding a room opens a panel for its guests, which is a sheet from the foot of the screen on phones. A tray keeps the rooms, the guests still to place and the estimate; on phones it waits in a bar at the foot of the screen. Day passes work the same way, by date.

Until the booking engine and Razorpay arrive, the tray sends the request on WhatsApp, to the resort's own number.

- A site describes its rooms, packages and day passes in `src/content/booking.ts`, from the facts in `src/content/resort.ts`.
- A site styles the widget with the `--bk-*` values in its `globals.css`. `packages/booking-ui/src/booking.css` lists them. `--bk-sticky-top` is the site header's height, set once for phones and once from md up, so the room bar and the tray stick just below the header.
- Friday and Saturday nights take the weekend rate. Every other night takes the weekday rate.
- When a resort doesn't publish a rate that the guests need, the widget leaves that price for the team to quote. It never guesses one.

## Deploy

Each app is its own Vercel project in the team "rutwik187's projects", linked to this repo. Its Root Directory setting is its own folder. A push to `main` deploys to production; any other branch makes a preview.

| Vercel project | Root Directory | Main address | Also answers |
|---|---|---|---|
| `prathameshresorts` | `apps/khed-shivapur` | prathameshresorts.com | www, redirected |
| `gocrazyadventure` | `apps/go-crazy` | www.gocrazyadventure.com | the bare domain, redirected |
| `sinhagadbliss` | `apps/sinhagad-bliss` | sinhagadbliss.com | www, redirected |
| `prathameshvalleyresorts` | `apps/valley` | www.prathameshvalleyresorts.com | the bare domain, redirected |
| `prathamesh-admin` | `apps/admin` | prathamesh-admin.vercel.app | none |

The main addresses are the ones the old WordPress sites used, so search results keep their links. Each app's `siteUrl` in `src/content/site.ts` matches.

**The admin's look** comes from shadcn/ui. Its components are in `apps/admin/src/components/ui`, added with `npx shadcn@latest add <name>` from `apps/admin` (see `components.json`); after adding one, check that it imports `cn` from `@/lib/utils`. The brand colour and the chart green are in `apps/admin/src/app/globals.css`; the type is Geist. Each resort's photo for its cards is in `apps/admin/src/assets/resorts`, a small copy of a photo from its own site.

**The admin builds without Turbopack's build cache** (`turbopackFileSystemCacheForBuild: false` in `apps/admin/next.config.ts`). Vercel restores `.next/cache` from the last deployment, and with that cache on, a build shipped an old stylesheet next to new pages. After a deploy that changes `globals.css`, check that the live stylesheet has the change.

**The admin's project** runs its functions in Singapore (`sin1`), next to the Neon database; the sites keep the default region. Its variables are `DATABASE_URL` (the pooled address), `BETTER_AUTH_SECRET` (its own, not the one in your `.env.local`), `BETTER_AUTH_URL` (https://prathamesh-admin.vercel.app), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `WEBSITE_URLS` (each site's address, such as `KS=https://prathameshresorts.vercel.app`) and `REVALIDATE_SECRET`.

**The sites' projects** have `DATABASE_URL` and the same `REVALIDATE_SECRET`. Each site's Stays and Day packages pages read the admin's catalogue when they build, and again when the admin calls the site's `/api/revalidate` after staff change rooms, rates or packages. Without the database, a site shows its own content as before. A changed variable takes effect only in a new deployment. Because the Ignored Build Step skips a commit that is already deployed, redeploy after changing only variables by clearing the step for one build, then setting it back.

**Google sign-in** uses one OAuth client of the "web application" kind, in the Google Cloud console:

| Where | Authorized JavaScript origin | Authorized redirect URI |
|---|---|---|
| This machine | http://localhost:3010 | http://localhost:3010/api/auth/callback/google |
| Vercel | https://prathamesh-admin.vercel.app | https://prathamesh-admin.vercel.app/api/auth/callback/google |

If the admin moves to its own domain, add that domain to both lists and change `BETTER_AUTH_URL`. Preview deployments can't sign in with Google, because their addresses change with every build.

- Every project runs `npx turbo-ignore` as its Ignored Build Step: a push builds only the sites it changes, through their own files or a shared package.
- Never set a custom Install Command: Vercel would fall back to pnpm 6. The root `package.json` pins pnpm 12 with `packageManager`.
- The domains are registered at Hostinger, which also runs their DNS and their Google Workspace mail. To move a site, change only its A record and its `www` record to the values Vercel shows. Keep the nameservers and the MX and TXT records, or the resort's email stops.

Each app's `next.config.ts` redirects the old WordPress site's pages to their new homes, so old links and search results keep working when a domain moves to Vercel. prathameshresorts.com also sends `/go-crazy`, `/sinhagad-bliss` and `/valley` to the other resorts.

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
| `packages/booking-ui` | `@repo/booking-ui` | The booking widget that all four sites share: the search bar, the room and day-pass lists, and the tray |
| `packages/sites` | `@repo/sites` | The group's four resorts: names, places and website addresses |
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

When a task's files have not changed since the last run, Turborepo skips the task and replays the saved result.

To run a task in one app only, add a filter, for example `pnpm dev --filter=khed-shivapur`.

Add each dependency to the package that uses it, for example `pnpm add lenis --filter=khed-shivapur`. The root `package.json` holds only tools for the whole repository, such as `turbo`.

Turborepo passes a task only the environment variables that `turbo.json` lists. When code reads a new variable, add it to the task's `env` list. ESLint reports any variable that is missing.

## Booking

Every site books with the shared widget in `packages/booking-ui`, the way MakeMyTrip does it. The guest chooses dates, rooms and guests, adds a room and says who stays in it, then adds other rooms of any type. A bar under the site header names every room type and jumps to it. Adding a room opens a panel for its guests, which is a sheet from the foot of the screen on phones. A tray keeps the rooms, the guests still to place and the estimate; on phones it waits in a bar at the foot of the screen. Day passes work the same way, by date.

Until the booking engine and Razorpay arrive, the tray sends the request on WhatsApp, to the resort's own number.

- A site describes its rooms, packages and day passes in `src/content/booking.ts`, from the facts in `src/content/resort.ts`.
- A site styles the widget with the `--bk-*` values in its `globals.css`. `packages/booking-ui/src/booking.css` lists them. `--bk-sticky-top` is the site header's height, set once for phones and once from md up, so the room bar and the tray stick just below the header.
- Friday and Saturday nights take the weekend rate. Every other night takes the weekday rate.
- When a resort doesn't publish a rate that the guests need, the widget leaves that price for the team to quote. It never guesses one.

## Deploy

Each app is its own Vercel project. Its Root Directory setting is its own folder.

| Vercel project | Root Directory | Domain |
|---|---|---|
| `prathameshresorts` | `apps/khed-shivapur` | prathameshresorts.com |
| To create | `apps/go-crazy` | gocrazyadventure.com |
| To create | `apps/sinhagad-bliss` | sinhagadbliss.com |
| To create | `apps/valley` | prathameshvalleyresorts.com |

Each app's `next.config.ts` redirects the old WordPress site's pages to their new homes, so old links and search results keep working when a domain moves to Vercel. prathameshresorts.com also sends `/go-crazy`, `/sinhagad-bliss` and `/valley` to the other resorts.

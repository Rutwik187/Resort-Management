# Prathamesh Group

The resort websites and the admin dashboard of the Prathamesh Group. This repository is a monorepo: it holds the apps and the packages they share. [Turborepo](https://turborepo.dev) runs the tasks and caches their results. [pnpm](https://pnpm.io) installs the dependencies.

The plan for the whole platform is in [`docs/implementation-plan.md`](docs/implementation-plan.md).

## What is where

| Folder | Package | What it holds |
|---|---|---|
| `apps/khed-shivapur` | `khed-shivapur` | The Khed Shivapur website, prathameshresorts.com |
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
| `pnpm dev` | Starts the apps in development mode. The Khed Shivapur site opens at http://localhost:3000 |
| `pnpm build` | Checks the types, then builds the apps |
| `pnpm lint` | Checks the code with ESLint |
| `pnpm typecheck` | Checks the TypeScript types |

When a task's files have not changed since the last run, Turborepo skips the task and replays the saved result.

To run a task in one app only, add a filter, for example `pnpm dev --filter=khed-shivapur`.

Add each dependency to the package that uses it, for example `pnpm add lenis --filter=khed-shivapur`. The root `package.json` holds only tools for the whole repository, such as `turbo`.

Turborepo passes a task only the environment variables that `turbo.json` lists. When code reads a new variable, add it to the task's `env` list. ESLint reports any variable that is missing.

## Deploy

Each app is its own Vercel project. The `prathameshresorts` project builds `apps/khed-shivapur`, so its Root Directory setting is `apps/khed-shivapur`.

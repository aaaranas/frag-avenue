# Frag Avenue — Architecture

## Shape

Modular monolith. One deployable Next.js 15 App Router application, one PostgreSQL database, no microservices. All derived stats are computed in-process.

## Layers

```
src/app          Route composition. Server Components by default. No business logic, no Prisma.
src/components   Presentational UI + app shell (nav, layout primitives). No Prisma.
src/modules/*    Domain modules. Own their application services, domain logic, and data access.
src/lib          Cross-cutting infrastructure: Prisma client singleton, env parsing, small utils.
```

Dependency direction is strictly downward: `app → components/modules → lib`. Modules import each other only via the exporting module's `index.ts`.

## Modules

- `auth` — Auth.js v5 setup, session helpers, `requireUser()`.
- `users` — profile, username, time zone, units, default visibility.
- `fragrances` — canonical catalogue (Brand, Fragrance, Note, Accord, joins), user submissions, the Wikidata import parser.
- `wardrobe` — user-owned items (bottle, decant, sample, wishlist), cost per wear.
- `wear-logs` — the log flow, wear edit/delete, check-ins (`dueCheckIn`, `checkInTimeline`).
- `weather` — `WeatherService` with Open-Meteo and static providers. Isolated so a future native client can share.
- `social` — visibility rules, follows, kudos, comments, feed and profile queries.
- `clubs` — clubs, membership, challenge progress and leaderboards.
- `analytics` — pure functions: stats, streaks, untouched, pick-for-today, challenges, money. No Prisma.

`analytics` stays framework-free so it is trivially unit-testable and could later back a Node service, an Expo client, or a scheduled job.

## Data access

Prisma is the persistence boundary. We do NOT add a repository layer on top — Prisma already provides typed queries and a transaction API. Modules that read/write persistence have a `data.ts` (thin) that returns typed shapes; `service.ts` orchestrates domain logic; `index.ts` re-exports the public API.

## Server Components vs Client Components

Server Components by default. `"use client"` only for interactivity that cannot be Server-rendered: form state with rich validation, charts, disclosure widgets, PWA install prompt.

## Server actions and route handlers

- Every server action / route handler:
  1. Resolves the user via `requireUser()` (Auth.js server session). Client-supplied user ids are ignored.
  2. Validates input with Zod.
  3. Calls a module service function.
  4. Returns a typed result or throws a typed error.

- Route handlers are used for third-party integrations (weather proxy, webhook) and PWA needs. Everything else prefers server actions.

## Auth

Auth.js v5 (NextAuth v5) with the Prisma adapter and a Credentials provider. Passwords are stored on `User.passwordHash` as bcrypt hashes (12 rounds). **Session strategy is JWT** — the Credentials provider does not support database sessions in v5. The Prisma adapter is retained so future OAuth providers persist users cleanly. The session guard for every authenticated route is `requireUser()` in `src/modules/auth`, called from `src/app/(app)/layout.tsx`; we intentionally do not use `middleware.ts` for auth checks so we avoid running Prisma in the edge runtime.

## Weather

Open-Meteo forecast + geocoding, no API key. All responses pass through a Zod schema. Weather values on `WearLog` are always overridable; we store the source (`AUTO | MANUAL`) so analytics can weight by data quality.

## PWA

Manifest at `public/manifest.webmanifest`, linked from the root layout. Service worker will be added when there is real offline value to justify it — for now the app is installable but does not cache authenticated responses (avoids cross-user cache leaks).

## Testing

- **Vitest** for unit and integration tests. Pure functions (`analytics`, check-ins, visibility rules) get fixture-based unit tests.
- **React Testing Library** for behaviourally significant components (forms, the wear-log flow).
- **Playwright** for critical user journeys: sign in → add fragrance → log wear.

## CI

GitHub Actions: install, typecheck, lint, test on every push and PR. E2E runs on PRs to main.

## Deployment

Vercel-compatible. Postgres is external (Neon / Supabase / RDS). Env vars documented in `.env.example`. No serverless-hostile dependencies (no Redis, no long-running workers).

## Notable decisions

- **No repository pattern.** Prisma is already the boundary. Adding another layer would be ceremony.
- **Money as integer minor units + ISO currency code.** Never a float, never a single "currency-less" number.
- **Timestamps as UTC in the DB; each wear keeps the IANA zone it was logged in.** A wear's day is its local date in that zone; "today" is in `User.timezone`.
- **Canonical `Fragrance` is separate from `CollectionItem`.** Two users owning "Aventus" share the canonical row.
- **Derived state is computed, never stored.** Streaks, stats, challenge progress, and pending check-ins are pure functions of the wears and `today`/`now`.

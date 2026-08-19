# Frag Avenue

An intelligent fragrance wardrobe and personal fragrance analytics PWA.

**Core loop:** Collect → Wear → Record → Learn → Recommend.

The differentiator is not another collection tracker — it's turning your longitudinal wear data into **explainable** personal fragrance intelligence. Every recommendation carries a score decomposed into named reasons derived from real numbers. No LLM narration, no fabricated precision.

## Status

MVP-complete foundation. Every slice from the delivery plan is on the ground:

- Authentication (Auth.js v5, credentials + bcrypt)
- Fragrance catalogue (search + detail)
- Collection CRUD (per-user, currency-aware, mixed-currency safe)
- Wear journal (weather auto-fill from Open-Meteo, all fields overridable)
- Dashboard (owned, value per currency, total wears, most-worn 90d, neglected, recent activity)
- Scent Intelligence (preferred accords, houses, seasonal patterns, weather-rating correlation, cost per wear)
- Advisor — "What should I wear?" (5 sub-scores, cold-start path, weight overrides)
- PWA (installable, offline fallback, no cross-user cache leaks)
- E2E + hardening (Playwright golden path, in-memory rate limits, security headers, error boundaries, structured logger)
- CI (typecheck / lint / unit tests + Playwright with a Postgres service container)

**242 unit tests + 37 Playwright tests (chromium + mobile-safari). Every check green.**

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · pnpm · Tailwind CSS 4 · PostgreSQL 16 · Prisma 6 · Auth.js v5 · Zod · Open-Meteo · Vitest · Playwright · GitHub Actions.

Modular monolith, Vercel-compatible. No Redis, no microservices, no ML service — none needed for the MVP.

## Quickstart

Prereqs: **Node 22 LTS**, **pnpm 10**, **Docker Desktop**.

```bash
pnpm install
pnpm db:up                    # Postgres 16 via docker compose (host port 55432)
cp .env.example .env          # then edit AUTH_SECRET
# generate a secret:  openssl rand -hex 32   (or pnpm dlx auth secret)
pnpm db:migrate               # apply migrations
pnpm db:seed                  # 7 canonical fragrances + a dev account
pnpm dev
```

Open http://localhost:3000 and sign in with the seeded development account:

| Email           | Password         |
| --------------- | ---------------- |
| `dev@frag.test` | `devpassword123` |

It comes with 7 bottles and 30 wears spread over the last ~140 days, which is
past the cold-start thresholds — so the dashboard, insights, and advisor all
have real data to work with on first run. The Playwright suite signs in as this
same account.

The dev account's collection and wear logs are **rebuilt from scratch on every
`pnpm db:seed`** (that is what keeps the relative dates meaningful). Nothing
outside that one account is touched, but don't use it for work you want to keep
— sign up your own account for that. The account is only created when
`DATABASE_URL` points at a local host, so seeding a remote database populates
the catalogue and nothing else. Override with `SEED_DEV_USER=true`.

> **Note on `.env` vs `.env.local`:** Prisma CLI only reads `.env`. Use `.env` for `DATABASE_URL` and `AUTH_SECRET`. Both are gitignored.
>
> **Note on Postgres port:** the docker-compose config binds host port **55432** (not 5432) to avoid clashing with a native Postgres install on your machine.

## Commands

| Command                         | What it does                                        |
| ------------------------------- | --------------------------------------------------- |
| `pnpm dev`                      | Next.js dev server                                  |
| `pnpm build` / `pnpm start`     | Production build / server                           |
| `pnpm typecheck`                | `tsc --noEmit`                                      |
| `pnpm lint` / `pnpm format`     | ESLint / Prettier                                   |
| `pnpm test` / `pnpm test:watch` | Vitest                                              |
| `pnpm test:e2e`                 | Playwright (needs `db:up + migrate + seed + build`) |
| `pnpm db:up` / `pnpm db:down`   | Start / stop Postgres container                     |
| `pnpm db:migrate`               | `prisma migrate dev`                                |
| `pnpm db:seed`                  | Canonical fragrance catalogue + dev account         |
| `pnpm db:studio`                | Prisma Studio                                       |
| `pnpm db:generate`              | Regenerate Prisma client                            |

## Architecture

Modular monolith. Strict layer direction — `app → components/modules → lib`.

```
src/app          Route composition. Server Components by default. No business logic, no Prisma.
src/components   Presentational UI + app shell. No Prisma.
src/modules/*    Domain modules (auth, fragrances, collection, wear-logs, weather,
                 analytics, recommendations). Each owns its data, services, and public index.ts.
src/lib          Cross-cutting infrastructure (prisma client, env, rate-limit, logger).
```

Recommendation and analytics logic is **framework-free** — no React, no Next, no Prisma imports in the scoring or aggregation files. Everything scored/aggregated is a pure function fed by a thin server-only `data.ts`. That's why it has 62 fixture-based tests without spinning up a database.

Deeper reading:

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — scope and non-goals
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — decisions and rationale
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — entities, invariants
- [`docs/RECOMMENDATION_ENGINE.md`](docs/RECOMMENDATION_ENGINE.md) — sub-score contract, cold-start rules
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — sequence and deferred items
- [`CLAUDE.md`](CLAUDE.md) — engineering rules that apply to every slice

## Testing

- **Vitest** — unit tests colocated as `*.test.ts` next to the code they cover. Analytics, recommendations, scoring, money, rate-limit, WMO codes, password hashing, all pure. Fixture-based; runs in ~4s.
- **Playwright** — the golden path (`sign up → browse → add → log wear → dashboard reflects → advisor recommends`), auth-redirect assertions for every protected route, and read-only specs driving the seeded account's shelf, advisor, and insights. A `setup` project signs in once and shares the session. Runs against a real Postgres and a built app, on chromium and mobile-safari.
- **CI** — `.github/workflows/ci.yml` runs typecheck / lint / unit on every push and PR, then Playwright with a Postgres service container. Reports uploaded on failure.

## Security posture

- Auth.js v5 sessions (JWT strategy — required by the Credentials provider).
- Passwords bcrypt-hashed (12 rounds).
- Every server action and route handler derives `userId` from the server session — never from a client field or URL parameter. Every data function takes `userId` as its **first** argument and includes it in every `where` clause.
- Zod validates every server-action input, every URL param, and every external API response (Open-Meteo).
- In-memory rate limits on `/sign-in` (10 / 15 min per ip+email), `/sign-up` (5 / hour per ip), `/api/weather` (60 / min per user+ip). The two auth budgets are overridable via `AUTH_SIGNIN_ATTEMPTS` / `AUTH_SIGNUP_ATTEMPTS` so the e2e suite can drive real auth from one IP; leave them unset in production.
- Security headers set in `next.config.ts`: HSTS, X-Content-Type-Options, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy, CSP (Report-Only for now while we tune).
- Service worker is safe by construction — no code path writes an authenticated response to cache; the offline fallback is a static file.
- Secrets are never committed. The pre-tool safety hook denies reads of `.env*`.

## Deploying to Vercel

Needs an external Postgres (Neon / Supabase / Vercel Postgres / RDS).

### Environment variables

Set these under **Settings → Environment Variables**:

| Variable              | Value                                         |
| --------------------- | --------------------------------------------- |
| `DATABASE_URL`        | **Pooled** connection string                  |
| `DIRECT_DATABASE_URL` | **Unpooled** connection string, same database |
| `AUTH_SECRET`         | `pnpm dlx auth secret` — min 16 chars         |

Two URLs are required because Prisma opens a connection per serverless instance
(so runtime needs a pooler) while `prisma migrate` cannot run through a
transaction-mode pooler (so migrations need a direct route). Per provider:

- **Neon** — pooled is the `-pooler` host; direct is the plain host.
- **Supabase** — pooled is port `6543` with `?pgbouncer=true&connection_limit=1`; direct is port `5432`.
- **Vercel Postgres** — `POSTGRES_PRISMA_URL` is pooled, `POSTGRES_URL_NON_POOLING` is direct.

`AUTH_URL` is not needed — Auth.js infers it from `VERCEL_URL`. Leave
`AUTH_SIGNIN_ATTEMPTS`, `AUTH_SIGNUP_ATTEMPTS`, and `SEED_DEV_USER` unset.

### Build

`vercel.json` sets the build command to `pnpm prisma migrate deploy && pnpm build`,
so committed migrations are applied on every deploy. Nothing to configure in the
dashboard — and if you have overridden the build command there, clear it, because
the dashboard value wins over `vercel.json`.

Preview deployments run that same command. If previews share the production
database, a branch carrying a migration will apply it to production — scope
`DATABASE_URL` to the Production environment, or give previews their own database.

### Seeding production

A fresh database has an empty catalogue. Seed it once from your machine:

```powershell
$env:DATABASE_URL="<prod pooled url>"; $env:DIRECT_DATABASE_URL="<prod direct url>"; pnpm db:seed
```

The seed refuses to create the `dev@frag.test` account unless `DATABASE_URL`
points at a local host, so this populates the catalogue only. That guard is
deliberately based on which database you are pointed at rather than `NODE_ENV`,
because the dangerous case is exactly when the two disagree.

### Known follow-ups before scale

- In-memory rate limiter → shared store (Upstash / Redis / KV). On serverless each instance keeps its own buckets, so the effective limit is per-instance.
- `src/lib/env.ts` exports `env()` but nothing calls it, so the startup validation never runs.
- CSP: `Report-Only` → enforced (needs nonce-injection middleware).
- Real PNG icons (192/512/maskable) for full Android splash-screen + older-iOS.

## License

Private. Not for redistribution.

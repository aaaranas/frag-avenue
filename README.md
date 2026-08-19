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

**109 unit tests + 2 Playwright tests. Every check green.**

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
— sign up your own account for that. The account is skipped when
`NODE_ENV=production` unless `SEED_DEV_USER=true`.

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
- **Playwright** — the golden path (`sign up → browse → add → log wear → dashboard reflects → advisor recommends`) plus an auth-redirect assertion. Runs against a real Postgres and a built app.
- **CI** — `.github/workflows/ci.yml` runs typecheck / lint / unit on every push and PR, then Playwright with a Postgres service container. Reports uploaded on failure.

## Security posture

- Auth.js v5 sessions (JWT strategy — required by the Credentials provider).
- Passwords bcrypt-hashed (12 rounds).
- Every server action and route handler derives `userId` from the server session — never from a client field or URL parameter. Every data function takes `userId` as its **first** argument and includes it in every `where` clause.
- Zod validates every server-action input, every URL param, and every external API response (Open-Meteo).
- In-memory rate limits on `/sign-in` (10 / 15 min per ip+email), `/sign-up` (5 / hour per ip), `/api/weather` (60 / min per user+ip).
- Security headers set in `next.config.ts`: HSTS, X-Content-Type-Options, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy, CSP (Report-Only for now while we tune).
- Service worker is safe by construction — no code path writes an authenticated response to cache; the offline fallback is a static file.
- Secrets are never committed. The pre-tool safety hook denies reads of `.env*`.

## Deployment

Vercel-compatible. External Postgres (Neon / Supabase / RDS). Env vars documented in `.env.example`. Follow-ups before scale:

- Commit initial Prisma migration → CI switches from `db push` to `migrate deploy`.
- In-memory rate limiter → shared store (Upstash / Redis / KV) for multi-instance.
- CSP: `Report-Only` → enforced (needs nonce-injection middleware).
- Real PNG icons (192/512/maskable) for full Android splash-screen + older-iOS.

## License

Private. Not for redistribution.

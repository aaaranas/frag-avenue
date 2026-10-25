# Frag Avenue

A Strava-style wear log for fragrance people, as an installable PWA.

**Core loop:** Collect → Wear → Check in → Share → Learn.

Log what you spray each day, with the weather attached; check in at 2, 4, and
8 hours on how it is holding up; share it with the people who follow you; and
see your streaks, most-worn scents, and untouched bottles add up.

## What's in it

Five tabs: **Feed**, **Wardrobe**, **Log** (the centre "+"), **Stats**, **Clubs**.
Your profile sits in the top bar (mobile) or the sidebar footer (desktop).

- **Feed**: your wears and those of people you follow, filtered by each wear's
  visibility (Only me / Followers / Everyone). Kudos, comments, follow
  anyone, and profiles at `/u/[username]`. A "Pick for today" card suggests
  an owned scent you haven't worn lately.
- **Wardrobe**: bottles, decants, samples, and a wishlist, with price, fill
  level, wear count, and cost per wear. Search the catalogue, or submit a
  missing fragrance (visible only to you until it is reviewed).
- **Log**: pick an owned item, then sprays, occasion, mood, a note,
  visibility, and an optional weather snapshot (Open-Meteo). In-app check-ins
  open at 2, 4, and 8 hours and stop once you mark it gone.
- **Stats**: wears, unique scents, day streak, most worn, accord breakdown,
  and items untouched for 30+ days, over 30 days, 90 days, or all time.
- **Clubs**: create, join, and leave clubs; the two global challenges (30
  scents in 30 days, 5 houses in 30 days) with live progress and per-club
  leaderboards that only count wears you are allowed to see.
- **PWA**: installable (PNG and maskable icons, iOS touch icon and an "Add
  to Home Screen" hint), offline fallback, and a service worker that never
  caches an authenticated response.

Greyscale with a single accent colour, mobile-first at 390px, 44px touch
targets, and text that meets WCAG AA in light and dark mode.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · pnpm · Tailwind CSS 4 · shadcn/ui · PostgreSQL 16 · Prisma 6 · Auth.js v5 · Zod · Open-Meteo · Vitest · Playwright · GitHub Actions.

Modular monolith, Vercel-compatible. No Redis, no microservices.

## Quickstart

Prereqs: **Node 22 LTS**, **pnpm 10**, **Docker Desktop**.

```bash
pnpm install
pnpm db:up                    # Postgres 16 via docker compose (host port 55432)
cp .env.example .env          # then edit AUTH_SECRET
# generate a secret:  openssl rand -hex 32   (or pnpm dlx auth secret)
pnpm db:migrate               # apply migrations
pnpm db:seed                  # catalogue + two dev accounts and a club
pnpm dev
```

Open http://localhost:3000 and sign in with a seeded development account (or
set up Google sign-in, below):

| Account | Email            | Password         | What it has                                         |
| ------- | ---------------- | ---------------- | --------------------------------------------------- |
| `@dev`  | `dev@frag.test`  | `devpassword123` | 10 wardrobe items and 30 wears over ~140 days       |
| `@mika` | `mika@frag.test` | `devpassword123` | a few wears at each visibility; follows `@dev` back |

Both are members of the "Manila Fragheads" club. The Playwright suite signs in
as `@dev`.

The dev accounts' wardrobes and wears are **rebuilt from scratch on every
`pnpm db:seed`** (that is what keeps the relative dates meaningful). Nothing
outside them is touched, but don't use them for work you want to keep: sign
up your own account for that. They are only created when `DATABASE_URL`
points at a local host, so seeding a remote database populates the catalogue
and nothing else. Override with `SEED_DEV_USER=true`.

> **Note on `.env` vs `.env.local`:** Prisma CLI only reads `.env`. Use `.env` for `DATABASE_URL` and `AUTH_SECRET`. Both are gitignored.
>
> **Note on Postgres port:** the docker-compose config binds host port **55432** (not 5432) to avoid clashing with a native Postgres install on your machine.

### Google sign-in (optional)

1. In Google Cloud Console → APIs & Services → Credentials, create an OAuth
   client ID of type **Web application**.
2. Add the authorised redirect URIs `http://localhost:3000/api/auth/callback/google`
   and, for production, `https://<your-domain>/api/auth/callback/google`.
3. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env` (and in Vercel).

Without them the Google button is hidden. A first Google sign-in creates an
account (the feed then asks for a username). If the email already has a
password account, Google is refused rather than linked, because password
accounts never verified their email; sign in with the password and use
**Connect Google** on the profile instead.

### The catalogue

The catalogue is our own `Fragrance` table. It is never scraped from
Fragrantica, Parfumo, or any other site (their terms forbid copying; type
details from the box, the house's own site, or your nose). It comes from:

- **`prisma/data/catalogue.csv`**, the curated list: one row per fragrance.
  Open it in Excel, Google Sheets, Numbers, or GitHub's editor. Columns (only
  `house` and `fragrance` are required; order and case don't matter):

  | Column                                   | Example                              |
  | ---------------------------------------- | ------------------------------------ |
  | `house`                                  | Rasasi                               |
  | `fragrance`                              | Hawas Ice                            |
  | `concentration`                          | EDP, EDT, Extrait, … (blank → Other) |
  | `year`                                   | 2022                                 |
  | `gender`                                 | masculine, feminine, unisex          |
  | `perfumer`                               |                                      |
  | `top notes`, `heart notes`, `base notes` | bergamot; lemon; grapefruit          |
  | `accords` (name:strength, 1–5)           | aquatic:5; fresh:5; citrus:4         |

- **Photos** in `public/catalog/`, matched to rows by name. For one photo:
  `pnpm catalog:image <photo> "<House>" "<Fragrance>"`. For many, name each
  file `House - Fragrance.jpg`, put them in a folder, and run
  `pnpm catalog:image <folder>`. Each becomes a transparent WebP cutout
  (plain light background removed, trimmed, metadata stripped), and any
  fragrance the CSV doesn't list yet gets a row to fill in.
- **Wikidata** (CC0): houses, names, and years in bulk. `pnpm db:catalogue:fetch`
  runs one SPARQL query and writes `prisma/data/wikidata-catalogue.json`;
  review and commit it. Create-only: it never overwrites a curated row.

**Getting it live:** commit and push. The Vercel build runs
`pnpm catalog:apply` after migrations: it validates the whole CSV (a bad row
fails the build, so the old version keeps serving), then adds new rows and
updates changed ones. It never deletes a fragrance, and rows the CSV doesn't
list (user submissions, Wikidata) are left alone. `pnpm db:seed` does the same
locally, and `pnpm catalog:apply --check` validates the CSV without a database.
CI also validates it (`catalogue-file.test.ts`).

## Commands

| Command                         | What it does                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`                      | Next.js dev server                                                            |
| `pnpm build` / `pnpm start`     | Production build / server                                                     |
| `pnpm typecheck`                | `tsc --noEmit`                                                                |
| `pnpm lint` / `pnpm format`     | ESLint / Prettier                                                             |
| `pnpm test` / `pnpm test:watch` | Vitest                                                                        |
| `pnpm test:e2e`                 | Playwright (needs `db:up + migrate + seed + build`)                           |
| `pnpm db:up` / `pnpm db:down`   | Start / stop Postgres container                                               |
| `pnpm db:migrate`               | `prisma migrate dev`                                                          |
| `pnpm db:seed`                  | Catalogue (curated + Wikidata snapshot) + dev accounts                        |
| `pnpm db:catalogue:fetch`       | Refresh the Wikidata snapshot (needs network)                                 |
| `pnpm catalog:image`            | Cut out one photo, or a folder of them, for the catalogue                     |
| `pnpm catalog:apply`            | Apply `catalogue.csv` (+ Wikidata) to the database (`--check`: validate only) |
| `pnpm db:studio`                | Prisma Studio                                                                 |
| `pnpm db:generate`              | Regenerate Prisma client                                                      |

## Architecture

Modular monolith. Strict layer direction: `app → components/modules → lib`.

```
src/app          Route composition. Server Components by default. No business logic, no Prisma.
src/components   Presentational UI + app shell. No Prisma.
src/modules/*    Domain modules (auth, users, fragrances, wardrobe, wear-logs, weather,
                 social, clubs, analytics). Each owns its data, services, and public index.ts.
src/lib          Cross-cutting infrastructure (prisma client, env, time zones, units, rate-limit).
```

Derived state (streaks, stats, untouched items, pick-for-today, challenge
progress, pending check-ins) is never stored. It comes from pure functions
that take `today`/`now` as an argument, with no React, Next, or Prisma
imports, so they are unit-tested without a database. Instants are stored in
UTC with the IANA zone each wear was logged in; units are stored metric.

Deeper reading:

- [`docs/PRODUCT.md`](docs/PRODUCT.md): scope and non-goals
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): decisions and rationale
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md): entities, invariants
- [`docs/ROADMAP.md`](docs/ROADMAP.md): sequence and deferred items
- [`docs/refactor-plan.md`](docs/refactor-plan.md): the refactor into the wear-log platform, phase by phase
- [`CLAUDE.md`](CLAUDE.md): engineering rules that apply to every slice

## Testing

- **Vitest**: unit tests colocated as `*.test.ts(x)`. Stats, streaks, check-ins, visibility rules, challenges, cost per wear, time zones, units, and server-action validation and authorization.
- **Playwright**: sign in, add to wardrobe, log a wear, check in, kudos and comments between two accounts, follow, join a club, stats, installability, and auth redirects for every protected route. A `setup` project signs in once and shares the session. Runs against a real Postgres and a built app with `WEATHER_PROVIDER=static`, on chromium and mobile-safari.
- **CI**: `.github/workflows/ci.yml` runs typecheck / lint / unit on every push and PR, then Playwright with a Postgres service container. Reports uploaded on failure.

## Security posture

- Auth.js v5 sessions (JWT strategy — required by the Credentials provider). Google sign-in requires a Google-verified email and never links itself to an existing account by email.
- Passwords bcrypt-hashed (12 rounds).
- Every server action and route handler derives `userId` from the server session — never from a client field or URL parameter. Every data function takes `userId` as its **first** argument and includes it in every `where` clause.
- Zod validates every server-action input, every URL param, and every external API response (Open-Meteo).
- Every query that returns wears to someone other than their owner goes through the visibility builders in `src/modules/social/visibility.ts`; leaderboards count only wears the viewer may see.
- In-memory rate limits on `/sign-in` (10 / 15 min per ip+email), `/sign-up` (5 / hour per ip), `/api/weather` (60 / min per user+ip), plus kudos, comments, follows, and club creation. The two auth budgets are overridable via `AUTH_SIGNIN_ATTEMPTS` / `AUTH_SIGNUP_ATTEMPTS` so the e2e suite can drive real auth from one IP; leave them unset in production.
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
| `AUTH_GOOGLE_ID`      | Optional: Google OAuth client ID              |
| `AUTH_GOOGLE_SECRET`  | Optional: Google OAuth client secret          |

Two URLs are required because Prisma opens a connection per serverless instance
(so runtime needs a pooler) while `prisma migrate` cannot run through a
transaction-mode pooler (so migrations need a direct route). Per provider:

- **Neon** — pooled is the `-pooler` host; direct is the plain host.
- **Supabase** — pooled is port `6543` with `?pgbouncer=true&connection_limit=1`; direct is port `5432`.
- **Vercel Postgres** — `POSTGRES_PRISMA_URL` is pooled, `POSTGRES_URL_NON_POOLING` is direct.

`AUTH_URL` is not needed — Auth.js infers it from `VERCEL_URL`. Leave
`AUTH_SIGNIN_ATTEMPTS`, `AUTH_SIGNUP_ATTEMPTS`, and `SEED_DEV_USER` unset.

### Build

`vercel.json` sets the build command to
`pnpm prisma migrate deploy && pnpm catalog:apply && pnpm build`, so committed
migrations and the catalogue are applied on every deploy. Nothing to configure in the
dashboard — and if you have overridden the build command there, clear it, because
the dashboard value wins over `vercel.json`.

Preview deployments run that same command. If previews share the production
database, a branch carrying a migration will apply it to production — scope
`DATABASE_URL` to the Production environment, or give previews their own database.

### The catalogue in production

Every deploy applies `prisma/data/catalogue.csv` (and the Wikidata snapshot,
if committed) after migrations, so production needs no manual seeding. The
same preview caveat applies: a preview build pointed at the production
database writes the branch's catalogue there.

`pnpm db:seed` against production is still safe if you ever need it: the seed
refuses to create the dev accounts unless `DATABASE_URL` points at a local
host. That guard is deliberately based on which database you are pointed at
rather than `NODE_ENV`, because the dangerous case is exactly when the two
disagree.

### Known follow-ups before scale

- In-memory rate limiter → shared store (Upstash / Redis / KV). On serverless each instance keeps its own buckets, so the effective limit is per-instance.
- CSP: `Report-Only` → enforced (needs nonce-injection middleware).
- Check-in reminders are in-app only. Push notifications need a scheduler that Vercel Hobby's once-a-day cron cannot provide (see `docs/refactor-plan.md`, Phase 9).
- Open-Meteo's free tier is non-commercial only; revisit the weather provider if the project becomes commercial.

## License

Private. Not for redistribution.

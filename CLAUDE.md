# Frag Avenue

Strava-style wear-log PWA for fragrance enthusiasts. Core loop: Collect → Wear → Check in → Share → Learn. Five tabs: Feed, Wardrobe, Log (centre "+"), Stats, Clubs.

See `docs/PRODUCT.md` for product scope, `docs/ARCHITECTURE.md` for architectural rationale, `docs/DATA_MODEL.md` for the schema, and `docs/refactor-plan.md` for the in-progress refactor (phases, decisions, open items).

## Stack

- Next.js 15 (App Router, Server Components by default), React 19, TypeScript strict
- pnpm, Node 22 LTS
- Tailwind CSS 4, shadcn/ui, Recharts (only where charts communicate better than a stat card)
- PostgreSQL 16 (Docker Compose locally), Prisma 6
- Auth.js v5 (NextAuth v5) with Prisma adapter — credentials (email + password), JWT sessions
- Zod for validation, React Hook Form for complex forms
- Open-Meteo for weather/geocoding (no API key)
- Vitest + React Testing Library, Playwright for critical E2E
- GitHub Actions CI, Vercel-compatible deployment

Do not introduce new dependencies without checking they support the current Next 15 / React 19 runtime.

## Architecture rules

Modular monolith. Layer boundaries are enforced by convention:

```
src/app          UI / route composition (Server Components by default)
src/components   Presentational + shell UI
src/modules/*    Domain modules (auth, users, fragrances, collection, wear-logs,
                 weather, analytics, recommendations; social and clubs arrive
                 with their phases). Each module owns its application services,
                 domain logic, and data access.
src/lib          Cross-cutting infrastructure (prisma client, env, utils)
```

- React page components must NOT contain business logic or call Prisma directly. They call module services.
- Analytics and recommendation logic live in `src/modules/analytics` and `src/modules/recommendations` and must be pure and independently testable (no React, no Next imports).
- Weather fetching is isolated in `src/modules/weather` so a future native client can share the abstraction.
- Server-only code uses `import "server-only"` at the top of the file.
- Public server actions and route handlers MUST validate input with Zod and MUST authorize using the server session — never trust a client-supplied user id.

## Domain conventions

- **Time.** Store instants in UTC. Each wear stores the IANA zone it was logged in (`Wear.timeZone`, immutable); its day is its local date in that zone. "Today" is the local date in the user's current `User.timezone`. Use `src/lib/time-zone.ts` (`localDate`, `wallTime`, `zonedWallTimeToUtc`); never `Date#getHours()`/`getDate()`/`new Date("YYYY-MM-DDTHH:mm")` on user data — the server runs in UTC. A `datetime-local` value is a wall time, interpreted in the wear's zone.
- **Units.** Store metric (°C, ml). Convert only for display with `src/lib/units.ts`, according to `User.units`.
- **Visibility.** Every wear has a `visibility`. The column default is `PRIVATE`; only the log flow sets anything else, from `User.defaultVisibility`. Any query returning wears to someone other than their owner MUST use the builders in `src/modules/social/visibility.ts` (`visibleWearsWhere`, `feedWhere`, `profileWearsWhere`) — never a hand-written filter — and kudos/comments authorize through `findWearForInteraction`. Owner-only screens (edit, check-ins) keep `userId`-scoped queries.
- **Usernames.** Canonical lowercase (`src/lib/username.ts`), required at sign-up; accounts from before Phase 5 are prompted on the feed. Profiles live at `/u/[username]`.
- **Derived state.** Streaks, untouched items, challenge progress, pick-for-today, and pending check-ins are computed by pure functions (`src/modules/analytics/wear-stats.ts`, `src/modules/wear-logs/check-ins.ts`) that take `today`/`now` as an argument. Never store what can be derived.
- **Wishlist.** `WardrobeItem.kind = WISHLIST` is not owned: exclude it from pickers, cost per wear, untouched, and pick-for-today.
- **Catalogue photos.** Stored in the repo under `public/catalog/<brand-slug>-<fragrance-slug>.jpg` (re-encoded to strip metadata) and referenced by `Fragrance.imagePath`, set in `prisma/seed.ts`. Fix a wrong catalogue row by MOVING it (`CATALOGUE_MOVES` in the seed), never by recreating it — users' wardrobe items and wears point at its id.
- **Module barrels are client-safe.** `src/modules/<name>/index.ts` must never re-export a `server-only` file; server code imports `@/modules/<name>/data` directly.
- **Catalogue.** Our own `Fragrance` table. Never scrape Fragrantica, Parfumo, or any site against its terms. Seed from licence-compatible sources only (currently Wikidata, CC0). User submissions are `PENDING` until moderated.
- **Design.** Mobile-first at 390px, greyscale wireframe with ONE accent: `--accent-color` in `src/app/globals.css` (with derived `--accent-wash`/`--accent-line`). Never add a hue — no red for errors (use `.form-error` + `role="alert"`), no green for success. Use semantic tokens (`--fg`, `--fg-muted`, `--fg-faint`, `--rule`, `--bg*`); shadcn's `--accent` is a neutral hover surface, not the accent. Text tokens are AA on every surface (contrast table in `globals.css`). Every interactive element is ≥ 44×44px (`min-h-11`; `Button` sizes already comply), real `<a>`/`<button>` only, and no horizontal scroll at 390px (give grid columns `minmax(0,1fr)`). Base CSS goes in `@layer base`, never bare — unlayered rules override Tailwind utilities.
- **Navigation.** Five tabs: Feed, Wardrobe, Log (centre "+"), Stats, Clubs — defined in `src/components/shell/nav-items.ts`. Profile lives in the top bar (mobile) / sidebar footer (desktop). A tab whose screen is not rebuilt yet forwards to its legacy page and lists that page's prefix so it shows as current.
- **Forms.** Client forms with typed fields use `useFormAction` (`src/components/forms/use-form-action.ts`), not bare `useActionState`: React 19 resets a `<form action>` after every action call, including failed validation, which silently reverts typed values.
- **Check-ins.** Prompts are derived (`dueCheckIn`, `checkInTimeline`); the server accepts an answer only for the prompt open right now. Prompts render in pages via `<CheckInPrompts>`, not in the layout (layouts don't re-render on navigation).
- **Weather.** Behind `WeatherService` (`src/modules/weather`); server code calls `getWeatherService()`. `WEATHER_PROVIDER=static` gives fixed readings for e2e/offline only. Open-Meteo's free tier is non-commercial only and requires the attribution "Weather data by Open-Meteo.com" next to displayed data. Revisit the provider if the project becomes commercial.

## Directory conventions

- Route groups: `src/app/(app)/*` for authenticated shell, `src/app/(auth)/*` for auth screens.
- Colocate component tests as `*.test.tsx`; pure logic tests as `*.test.ts`.
- Module public API is exported from `src/modules/<name>/index.ts` — other modules import only from there.

## Commands

- `pnpm dev` — Next.js dev server
- `pnpm build` / `pnpm start`
- `pnpm lint` / `pnpm format` / `pnpm typecheck`
- `pnpm test` (Vitest) / `pnpm test:e2e` (Playwright)
- `pnpm db:up` — start Postgres via docker compose
- `pnpm db:migrate` — apply migrations (dev)
- `pnpm db:seed` — seed dev data
- `pnpm db:studio` — Prisma Studio

## Testing expectations

- Every module with domain logic (analytics, recommendations, scoring, cost-per-wear) has unit tests targeting behavior, not implementation.
- Server actions have at least one happy-path and one authorization test.
- Playwright covers: sign in, add fragrance to collection, log a wear.

## Database safety

- Never run `prisma migrate reset`, `db push --force-reset`, or drop the database non-interactively. Ask first.
- Migrations are committed. `prisma db push` is only for throwaway prototyping.
- Migrations are **expand-only**: add tables, nullable/defaulted columns, indexes, constraints. No drops, physical renames, or narrowing in the same release as the code change — Vercel runs `migrate deploy` before the new build takes traffic, so the old build must keep working. Rename models with `@@map`. Review generated SQL for `DROP`.
- `prisma migrate dev` is interactive; to author a migration non-interactively use `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <scratch db> --script`.
- Every schema change goes through the `database-change` skill.

## Git safety

- Do not commit or push unless the user explicitly asks. For the refactor, the user asked for one commit per phase directly on `main` (rollback point: tag `pre-refactor`). Pushing to `main` deploys to Vercel and applies migrations to production.
- Never force-push, reset --hard, clean -fd, or delete branches.
- Inspect `git status` before large changes; preserve unrelated modifications.

## Definition of done

A slice is done when: types pass, lint passes, tests pass, the feature works end-to-end in the browser, auth/authorization is verified, empty/loading/error states are handled, and the change touches only what the slice requires.

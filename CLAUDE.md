# Frag Avenue

Strava-style wear-log PWA for fragrance enthusiasts. Core loop: Collect → Wear → Check in → Share → Learn. Five tabs: Feed, Wardrobe, Log (centre "+"), Stats, Clubs.

See `docs/PRODUCT.md` for product scope, `docs/ARCHITECTURE.md` for architectural rationale, `docs/DATA_MODEL.md` for the schema, and `docs/refactor-plan.md` for the in-progress refactor (phases, decisions, open items).

## Stack

- Next.js 15 (App Router, Server Components by default), React 19, TypeScript strict
- pnpm, Node 22 LTS
- Tailwind CSS 4, shadcn/ui, Recharts (only where charts communicate better than a stat card)
- PostgreSQL 16 (Docker Compose locally), Prisma 6
- Auth.js v5 (NextAuth v5) with Prisma adapter — credentials (email + password) and Google (when `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are set), JWT sessions. Google never auto-links to an existing email (`OAuthAccountNotLinked`); signed-in users connect it from `/profile`.
- Zod for validation; client forms use `useFormAction` (see Forms below)
- Open-Meteo for weather/geocoding (no API key)
- Vitest + React Testing Library, Playwright for critical E2E
- GitHub Actions CI, Vercel-compatible deployment

Do not introduce new dependencies without checking they support the current Next 15 / React 19 runtime.

## Architecture rules

Modular monolith. Layer boundaries are enforced by convention:

```
src/app          UI / route composition (Server Components by default)
src/components   Presentational + shell UI
src/modules/*    Domain modules (auth, users, fragrances, wardrobe, wear-logs,
                 weather, social, clubs, analytics). Each module owns its
                 application services, domain logic, and data access.
src/lib          Cross-cutting infrastructure (prisma client, env, utils)
```

- React page components must NOT contain business logic or call Prisma directly. They call module services.
- Analytics logic lives in `src/modules/analytics` and must be pure and independently testable (no React, no Next, no Prisma imports).
- Weather fetching is isolated in `src/modules/weather` so a future native client can share the abstraction.
- Server-only code uses `import "server-only"` at the top of the file.
- Every database query is a round trip, and in production the database can be a region away: keep a page to a few. Nested selects load in one statement (`relationJoins`, so don't split them into follow-up queries); the signed-in user's settings come from `findUserSettings` (`src/modules/users/data.ts`, cached per request), not another `user.findUnique`; reads use `Promise.all`, not `$transaction` (BEGIN and COMMIT are two more round trips). Measure a page's queries before adding one to the shell layout.
- Public server actions and route handlers MUST validate input with Zod and MUST authorize using the server session — never trust a client-supplied user id.

## Domain conventions

- **Time.** Store instants in UTC. Each wear stores the IANA zone it was logged in (`Wear.timeZone`, immutable); its day is its local date in that zone. "Today" is the local date in the user's current `User.timezone`. Use `src/lib/time-zone.ts` (`localDate`, `wallTime`, `zonedWallTimeToUtc`); never `Date#getHours()`/`getDate()`/`new Date("YYYY-MM-DDTHH:mm")` on user data — the server runs in UTC. A `datetime-local` value is a wall time, interpreted in the wear's zone.
- **Units.** Store metric (°C, ml). Convert only for display with `src/lib/units.ts`, according to `User.units`.
- **Visibility.** Every wear has a `visibility`. The column default is `PRIVATE`; only the log flow sets anything else, from `User.defaultVisibility`. Any query returning wears to someone other than their owner MUST use the builders in `src/modules/social/visibility.ts` (`visibleWearsWhere`, `feedWhere`, `profileWearsWhere`) — never a hand-written filter — and kudos/comments authorize through `findWearForInteraction`. Owner-only screens (edit, check-ins) keep `userId`-scoped queries.
- **Usernames.** Canonical lowercase (`src/lib/username.ts`), required at sign-up; accounts from before Phase 5 are prompted on the feed. Profiles live at `/u/[username]`.
- **Derived state.** Streaks, untouched items, challenge progress, pick-for-today, and pending check-ins are computed by pure functions (`src/modules/analytics/wear-stats.ts`, `src/modules/wear-logs/check-ins.ts`) that take `today`/`now` as an argument. Never store what can be derived.
- **Wishlist.** `WardrobeItem.kind = WISHLIST` is not owned: exclude it from pickers, cost per wear, untouched, and pick-for-today.
- **Catalogue data.** The curated catalogue is `prisma/data/catalogue.csv` (parser: `src/modules/fragrances/catalogue-csv.ts`; diff: `catalogue-plan.ts`; applier: `prisma/catalogue.ts`). `pnpm catalog:apply` runs in the Vercel build after migrations and in `pnpm db:seed`: it validates the whole file first, creates/updates the rows it lists (fields, notes, accords, APPROVED), never deletes, and never touches rows it doesn't list. Add fragrances by adding rows; don't hand-write catalogue data migrations or seed arrays. Photos are transparent cutouts at `public/catalog/<brand-slug>-<fragrance-slug>.webp`, made with `pnpm catalog:image <photo> "<House>" "<Fragrance>"` or `pnpm catalog:image <folder>` (files named `House - Fragrance.jpg`; adds missing CSV rows); a photo is attached to its row by that name. Check cutouts on both themes. Fix a row filed under the wrong house by MOVING it (`CATALOGUE_MOVES` in `prisma/catalogue.ts`), never by recreating it — users' wardrobe items and wears point at its id.
- **Module barrels are client-safe.** `src/modules/<name>/index.ts` must never re-export a `server-only` file; server code imports `@/modules/<name>/data` directly.
- **Catalogue.** Our own `Fragrance` table. Never scrape Fragrantica, Parfumo, or any site against its terms. Seed from licence-compatible sources only: the curated CSV (details typed from the box, the house's site, or by hand — never copied from sites whose terms forbid it), plus Wikidata (CC0) via a committed snapshot (`pnpm db:catalogue:fetch` → `prisma/data/wikidata-catalogue.json`; applied create-only). User submissions are `PENDING` until moderated.
- **Design.** Mobile-first at 390px, greyscale wireframe with ONE accent: `--accent-color` in `src/app/globals.css` (with derived `--accent-wash`/`--accent-line`). Never add a hue (exceptions: Google's full-colour "G" on its sign-in button, required by its branding rules; and share images, which are artwork posted elsewhere and take their colour from the bottle photo) — no red for errors (use `.form-error` + `role="alert"`), no green for success. Use semantic tokens (`--fg`, `--fg-muted`, `--fg-faint`, `--rule`, `--bg*`); shadcn's `--accent` is a neutral hover surface, not the accent. Text tokens are AA on every surface (contrast table in `globals.css`). Every interactive element is ≥ 44×44px (`min-h-11`; `Button` sizes already comply), real `<a>`/`<button>` only, and no horizontal scroll at 390px (give grid columns `minmax(0,1fr)`). Base CSS goes in `@layer base`, never bare — unlayered rules override Tailwind utilities.
- **Navigation.** Five tabs: Feed, Wardrobe, Log (centre "+"), Stats, Clubs — defined in `src/components/shell/nav-items.ts`. Profile lives in the top bar (mobile) / sidebar footer (desktop). A tab lists the prefixes of the screens it owns (e.g. `/u` under Feed, `/fragrances` under Wardrobe) so it shows as current there. A fragrance's photo and name link to its page with `fragranceHref(id, from)`, and that page's BackLink returns to `from` (`src/lib/back-to.ts`, which accepts only known in-app paths). Visited pages stay in the client router cache for 30s (`staleTimes.dynamic` in `next.config.ts`), so a write that doesn't revalidate looks stale: every action that writes calls `revalidatePath`.
- **UI primitives.** Use the shadcn components in `src/components/ui` (Button, Badge, AlertDialog, Avatar, Textarea, …) before hand-rolling; the shadcn tokens are mapped to the greyscale system in `globals.css`. Page structure: `PageHeader` (semibold title, actions inline, no eyebrow) on tab pages, `BackLink` on detail pages, `Section` for titled blocks, `SegmentedNav` for link-based choices, `EmptyState` with an icon and one `action`; cards are `rounded-xl`. Type: page title 26/30px semibold, section title `text-lg` semibold, body `text-sm`–`text-base`, meta `text-xs` muted; inputs are 16px (smaller makes iOS zoom). Accent-filled buttons are for a page's main action; repeated row actions (Join, Follow) use `quiet`. Destructive actions (delete, remove) go through `ConfirmAction` (`src/components/forms/confirm-action.tsx`). No route `loading.tsx`: the Suspense boundary it adds streamed pages in a way that lost taps during hydration (e2e caught it); navigation feedback is the tab's pending bar (`useLinkStatus`).
- **Forms.** Client forms with typed fields use `useFormAction` (`src/components/forms/use-form-action.ts`), not bare `useActionState`: React 19 resets a `<form action>` after every action call, including failed validation, which silently reverts typed values.
- **Share images.** A Share button on the viewer's OWN wears only (an image escapes its wear's visibility). `buildShareCard` (`src/components/share/share-card.ts`) turns a wear into plain strings on the server; the client draws the PNG on a canvas (`render-share-card.ts`, loaded on first use): Story 1080×1920, keeping content out of Instagram's top and bottom 250px, or Post 1080×1350. It is rendered when the dialog opens, because iOS only shares from inside the tap, and handed to `navigator.share` as a file with no text (Instagram drops shares that carry text); "Save image" downloads it.
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

- Every module with domain logic (stats, streaks, check-ins, visibility, challenges, cost per wear) has unit tests targeting behavior, not implementation.
- Server actions have at least one happy-path and one authorization test.
- Playwright covers: sign in, add to wardrobe, log a wear, check in, kudos, join a club, share images, and installability.

## Database safety

- Never run `prisma migrate reset`, `db push --force-reset`, or drop the database non-interactively. Ask first.
- Migrations are committed. `prisma db push` is only for throwaway prototyping.
- Migrations are **expand-only**: add tables, nullable/defaulted columns, indexes, constraints. No drops, physical renames, or narrowing in the same release as the code change — Vercel runs `migrate deploy` before the new build takes traffic, so the old build must keep working. Rename models with `@@map`. Review generated SQL for `DROP`.
- `prisma migrate dev` is interactive; to author a migration non-interactively use `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <scratch db> --script`.
- Every schema change goes through the `database-change` skill.

## Git safety

- Do not commit or push unless the user explicitly asks. For the refactor, the user asked for one commit per phase directly on `main` (rollback point: tag `pre-refactor`). Pushing to `main` deploys to Vercel and applies migrations to production.
- Commits are authored by the user (the repo's git identity), with a one-line conventional message (`feat:`, `fix:`, `docs:`, `refactor:`, …) and no co-author or session trailers.
- Never force-push, reset --hard, clean -fd, or delete branches.
- Inspect `git status` before large changes; preserve unrelated modifications.

## Definition of done

A slice is done when: types pass, lint passes, tests pass, the feature works end-to-end in the browser, auth/authorization is verified, empty/loading/error states are handled, and the change touches only what the slice requires.

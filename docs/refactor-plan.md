# Frag Avenue — Refactor Plan (Phase 0 audit)

Status: **approved 2026-10-25** (see §11 for the decisions). Phases 1–2 complete; later phases pending.

Target: refactor the existing personal-analytics PWA into a Strava-style wear-log platform (Feed · Wardrobe · Log · Stats · Clubs) without breaking the app or losing data at any point.

---

## 1. Audit

### 1.1 Stack and versions (resolved from `pnpm-lock.yaml`)

| Layer       | Version                                  | Notes                                                                                 |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Node / pnpm | 22 LTS / 10.33.2                         | `engines` says `>=20.12`, CI runs 22                                                  |
| Next.js     | 15.5.23 (App Router, typed routes)       | Server Components + server actions + `useActionState`                                 |
| React       | 19.2.8                                   |                                                                                       |
| TypeScript  | 5.x, `strict`                            | `pnpm typecheck` clean                                                                |
| Tailwind    | 4.3.3 + shadcn/ui (radix-ui 1.6)         | 115 CSS custom properties, "apothecary" palette with two accents (amber + green wash) |
| Prisma / PG | 6.19.3 / Postgres 16                     | `prisma.config.ts`, pooled + direct URLs, 3 committed migrations                      |
| Auth        | next-auth 5.0.0-beta.25                  | Credentials only, JWT sessions, Prisma adapter, bcryptjs (12 rounds)                  |
| Validation  | Zod 3.24, react-hook-form 7              | RHF is installed but forms use native `<form>` + server actions                       |
| Tests       | Vitest 2.1.9, RTL 16, Playwright 1.62    |                                                                                       |
| Weather     | Open-Meteo (no key), server proxy        |                                                                                       |
| Deploy      | Vercel, `prisma migrate deploy && build` |                                                                                       |

Baseline (2026-10-25, on this branch): **typecheck ✅ · lint ✅ · 242 unit tests ✅ (19 files)**. E2E not run in this audit (needs Postgres + build); README claims 37 passing on chromium + mobile-safari.

Nothing here needs changing to deliver the spec. **Recommendation: keep the stack as is.** The only new runtime dependencies the MVP needs are an object store client for photos (Phase 4, see Q3) and, for the stretch goal, `web-push`.

### 1.2 Folder structure

```
src/app/(auth)/        sign-in, sign-up (useActionState forms)
src/app/(app)/         authenticated shell — layout.tsx calls requireUser()
  dashboard/ collection/ collection/[id]/edit/ fragrances/ fragrances/[id]/
  wear/ wear/new/ wear/[id]/edit/ insights/ advisor/ profile/
src/app/api/           auth/[...nextauth], weather (GET ?lat&lon)
src/components/        bottle/ (SVG renderer), pwa/, shell/primary-nav, ui/ (shadcn + custom)
src/modules/           auth, fragrances, collection, wear-logs, weather, analytics, recommendations
src/lib/               prisma, env, logger, rate-limit (in-memory), request-ip, utils, accord-colors, bottle-appearance
prisma/                schema, 3 migrations, seed.ts (7 fragrances + dev account with 30 wears)
e2e/                   auth.setup, smoke, collection (golden path + seeded-account specs)
.claude/               agents, skills (build-feature, database-change, frag-domain), safety hooks
```

The layering in `CLAUDE.md` is honoured: no Prisma in `src/app`, pure `analytics`/`recommendations`, every `data.ts` takes `userId` first. This is the strongest part of the codebase and the refactor keeps it.

### 1.3 Routes

| Route                                   | Purpose                                                   | Fate in new IA                                                         |
| --------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `/`                                     | Marketing landing                                         | Keep (copy rewritten)                                                  |
| `/sign-in`, `/sign-up`                  | Auth                                                      | Keep; sign-up adds username + captures time zone                       |
| `/dashboard`                            | Stat summary, neglected, recent                           | → `/feed` (redirect) and `/stats`                                      |
| `/collection`, `/collection/[id]/edit`  | Shelf + edit                                              | → `/wardrobe`, `/wardrobe/[id]`                                        |
| `/fragrances`, `/fragrances/[id]`       | Catalogue search + add-to-collection                      | Keep as catalogue; add "submit missing"                                |
| `/wear`, `/wear/new`, `/wear/[id]/edit` | Journal list, log, edit                                   | → `/log` (create), `/wears/[id]` (detail/edit)                         |
| `/insights`                             | Scent intelligence                                        | → `/stats`                                                             |
| `/advisor`                              | 5-sub-score recommender                                   | Delete (weather ranking is out of scope); "Pick for today" replaces it |
| `/profile`                              | Account                                                   | → `/u/[username]` (public) + `/settings`                               |
| `/api/weather`                          | Open-Meteo proxy                                          | Keep path; backed by `WeatherService`                                  |
| new                                     | `/clubs`, `/clubs/[slug]`, `/u/[username]`, `/wears/[id]` |                                                                        |

Old URLs get permanent redirects so installed PWAs and bookmarks keep working.

### 1.4 Data model (current)

Auth.js core (`User`, `Account`, `Session`, `VerificationToken`), catalogue (`Brand`, `Fragrance`, `Note`, `FragranceNote`, `Accord`, `FragranceAccord` with 1–5 strength, curated bottle-appearance columns), user data (`CollectionItem`, `WearLog`).

- `CollectionItem`: `bottleSizeMl Int`, `remainingMl Int?`, `purchasePriceMinor Int?` + `currency`, `condition NEW|USED|DECANT`, rating, notes. No notion of sample or wishlist.
- `WearLog`: `wornAt` (UTC), `sprays` (1–20 validated), `occasion`, `environment`, inline weather (`temperatureC`, `humidityPct`, `weatherCondition`, `weatherSource AUTO|MANUAL|NONE`), post-hoc `longevityHours`, `projection`, `enjoyment`, `notes`. `collectionItemId` is nullable (wears of samples or borrowed bottles) and `fragranceId` is always set.
- `User.timezone` exists (default `"UTC"`) but **nothing ever writes or reads it**. All day bucketing is UTC (see `insights.ts:113`).
- No social tables, no photo storage, no check-ins, no moderation state on `Fragrance`.

### 1.5 Auth

Auth.js v5 Credentials + JWT. `requireUser()` in the `(app)` layout guards the shell; middleware only forwards `x-pathname` (edge-safe, no bcrypt). Sign-in/sign-up are rate limited in memory. Server actions re-derive `userId` from the session and verify ownership (e.g. a wear's `collectionItemId` must belong to the caller). Email/magic-link login is described in `CLAUDE.md` and `PRODUCT.md` but **not implemented**.

### 1.6 State management

No client store. Server Components read through module `data.ts`; mutations are server actions with `useActionState` and `revalidatePath`. Client state is local (search input, shelf detail panel, weather fieldset). `localStorage` is used only for the install-prompt dismissal. **Keep this model.** Kudos toggles get `useOptimistic`; nothing in the spec needs a global store.

### 1.7 PWA

- `public/manifest.webmanifest`: `start_url: /dashboard`, standalone, portrait, **one SVG icon only** (`sizes: any`). Chrome still installs it, but there are no 192/512/maskable PNGs, and iOS `apple-touch-icon` is an SVG, which iOS ignores, so the home-screen icon falls back to a screenshot.
- `public/sw.js` (v1): cache-first for `/_next/static` and `/icons`; network-only for HTML with an `offline.html` fallback; never caches API or authenticated HTML. Registered in production only, after idle.
- `InstallPrompt` handles `beforeinstallprompt` (Chromium only; no iOS "Add to Home Screen" hint).
- Offline: you get the static offline page and nothing else. A wear cannot be logged offline. The spec doesn't ask for offline logging, so this stays out of scope; the SW design stays as it is.
- Push: none. Adding it means a `push`/`notificationclick` handler in `sw.js`.

### 1.8 Tests

- 19 Vitest files / 242 tests: analytics (aggregations, insights, money), recommendations (scoring, sub-scores, recommender), schemas, server actions with mocked Prisma (happy path + authorization), weather codes, bottle renderer, rate limiter, passwords.
- Playwright: smoke (redirects for every protected route), golden path (sign up → add → log → dashboard), seeded-account specs for shelf, advisor, insights.
- Gaps against the new spec: no time-zone-aware tests, and nothing covers streaks, check-ins or social authorization (none of those exist yet).

### 1.9 Tech debt and findings

| #   | Finding                                                                                                                              | Severity       | Handled in                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------- |
| D1  | `User.timezone` is never captured; every "day" is a UTC day. The new streak rule depends on this.                                    | High           | P1                                          |
| D2  | Product docs say "not a social network". Existing wears were logged under that promise, so they must not become visible to others.   | High (privacy) | P1 (backfill `PRIVATE`)                     |
| D3  | `docs/DATA_MODEL.md` drifts from the schema (says default currency USD, schema says PHP; no bottle columns).                         | Low            | P1                                          |
| D4  | `src/lib/env.ts` exists but is never called, so env validation never runs.                                                           | Medium         | P1                                          |
| D5  | Rate limiter is in-memory, so the limit is per-instance on Vercel. Social write endpoints (comments, kudos) widen the abuse surface. | Medium         | P5 (note), shared store post-MVP            |
| D6  | CSP is Report-Only with `unsafe-inline`. Photo uploads need `img-src` for the blob host.                                             | Medium         | P4                                          |
| D7  | Manifest has no PNG icons; iOS has no usable touch icon.                                                                             | Medium         | P8                                          |
| D8  | Two-accent palette (amber + green) and a serif "apothecary" look conflict with the greyscale-plus-one-accent spec.                   | Medium         | P2                                          |
| D9  | `react-hook-form` and `@hookform/resolvers` are installed but unused.                                                                | Low            | P8                                          |
| D10 | Sprays validated 1–20; spec says 1–10. Existing rows may hold 11–20.                                                                 | Low            | P4                                          |
| D11 | Email auth is documented but missing.                                                                                                | Low            | Docs fix in P1; implementation out of scope |
| D12 | Open-Meteo free tier is **non-commercial only** (see §5).                                                                            | Depends on Q2  | P4                                          |

---

## 2. Keep / rewrite / delete

| Area                                                                           | Decision                             | Reason                                                                                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Stack, tooling, CI, Vercel config                                              | **Keep**                             | Fits the spec; changing it would be cost with no benefit                                                                              |
| Layering + module convention                                                   | **Keep**                             | Already enforced; new modules follow it                                                                                               |
| `auth` module, sign-in/sign-up                                                 | **Keep**, extend                     | Add `username`, time-zone capture on sign-up and in settings                                                                          |
| `fragrances` module (catalogue)                                                | **Keep**, extend                     | Add `status` (moderation) + submission action; search must hide `PENDING` from other users                                            |
| `collection` module                                                            | **Rewrite** → `wardrobe`             | New item kinds, filters, wear counts, CPW; reuse money helpers and the ownership checks                                               |
| `wear-logs` module                                                             | **Rewrite** → `wears`                | New form (sprays 1–10, mood, photo), visibility, check-ins; keep authorization pattern                                                |
| `weather` module                                                               | **Rewrite** behind `WeatherService`  | Existing Open-Meteo client becomes one implementation                                                                                 |
| `analytics` money + accord aggregation                                         | **Keep**                             | `costPerWearMinor`, `formatMoney`, accord distribution are reused by Stats                                                            |
| `analytics` insights (seasonal, weather-rating correlation)                    | **Delete** in P8                     | Not in the MVP Stats spec; the perf-vs-weather chart is a placeholder                                                                 |
| `recommendations` module + `/advisor`                                          | **Delete** in P8                     | Weather-ranked recommendations are out of scope; "Pick for today" is a 10-line pure function. Recoverable from the `pre-refactor` tag |
| `components/ui` (shadcn)                                                       | **Keep**, restyle                    | Tokens change, components stay                                                                                                        |
| `components/bottle` renderer                                                   | **Keep**, restyle                    | Good fit-level visual for Wardrobe; render greyscale with the accent as the liquid                                                    |
| `components/shell/primary-nav`                                                 | **Rewrite**                          | 5 tabs, centre "+" Log action, 44px targets                                                                                           |
| `/dashboard`, `/insights`, `/collection`, `/wear/*`, `/profile` pages          | **Delete** after replacement ships   | Redirects replace them                                                                                                                |
| `sw.js`, `register-sw`, `offline.html`                                         | **Keep**                             | Safe-by-construction design is correct; extend for push only if the stretch goal is approved                                          |
| `InstallPrompt`                                                                | **Keep**, extend                     | Add an iOS "Share → Add to Home Screen" hint (needed anyway for iOS push)                                                             |
| Seed                                                                           | **Rewrite**                          | New models, multiple users, follows, clubs; catalogue source depends on Q1                                                            |
| Docs (`PRODUCT`, `ARCHITECTURE`, `DATA_MODEL`, `ROADMAP`, README, `CLAUDE.md`) | **Rewrite**                          | Positioning changes from personal analytics to social wear log                                                                        |
| `.claude/` agents, skills, hooks                                               | **Keep**; update `frag-domain` skill | Domain definitions (CPW, streak, untouched) change                                                                                    |
| Unused RHF deps                                                                | **Delete**                           | Dead weight                                                                                                                           |

---

## 3. Proposed data model

Principles: **additive only**, so old code keeps running against the migrated database; models are renamed with `@@map` so physical table names don't change; metric units stored; UTC timestamps plus an IANA zone.

```prisma
enum ItemKind      { BOTTLE DECANT SAMPLE WISHLIST }
enum Mood          { CONFIDENT RELAXED HAPPY COZY FOCUSED ROMANTIC ENERGETIC OTHER }
enum Visibility    { PUBLIC FOLLOWERS PRIVATE }
enum CheckInResult { STRONG FAINT GONE }
enum CatalogStatus { APPROVED PENDING REJECTED }
enum ChallengeKind { UNIQUE_FRAGRANCES UNIQUE_HOUSES }
enum UnitSystem    { METRIC IMPERIAL }

model User {            // existing + new columns
  username   String?  @unique   // nullable for backfill; required at sign-up, prompted for existing users
  bio        String?
  timezone   String   @default("UTC")   // now captured from Intl on sign-up and on every wear
  units      UnitSystem @default(METRIC)
  defaultVisibility Visibility @default(FOLLOWERS)
}

model Fragrance {       // existing + moderation
  status        CatalogStatus @default(APPROVED)  // existing rows stay APPROVED
  submittedById String?       // User; SetNull on delete
}

model WardrobeItem {    // was CollectionItem
  @@map("CollectionItem")
  kind          ItemKind @default(BOTTLE)  // backfill: condition=DECANT → DECANT
  bottleSizeMl  Int?     // was Int; nullable for wishlist
  remainingMl   Int?     // fill level = remainingMl / bottleSizeMl
  purchasePriceMinor Int?  currency String?   // unchanged
  // condition, rating, notes, batch … kept
}

model Wear {            // was WearLog
  @@map("WearLog")
  wornAt        DateTime              // UTC (existing)
  timeZone      String                // NEW: IANA zone at log time; backfill from User.timezone
  sprays        Int                   // new writes validated 1–10
  occasion      Occasion
  mood          Mood?                 // NEW
  notes         String?               // existing; shown as "note"
  photoKey      String?               // NEW: object-store key, not a public URL
  visibility    Visibility            // NEW: backfill PRIVATE for all existing rows (D2)
  // Weather snapshot — kept inline (1:1, always read with the wear, no join):
  temperatureC  Float?   humidityPct Int?   weatherCondition String?   weatherSource WeatherSource
  weatherProvider String?             // NEW: "open-meteo" | "met-norway"; needed for attribution
  weatherObservedAt DateTime?         // NEW
  // Legacy, kept read-only, hidden from new UI: environment, longevityHours, projection, enjoyment
  checkIns CheckIn[]  kudos Kudos[]  comments Comment[]
  @@index([userId, wornAt])  @@index([wornAt])   // feed fan-in
}

model CheckIn  { id; wearId; offsetHours Int /* 2|4|8 */; result CheckInResult; recordedAt DateTime
                 @@unique([wearId, offsetHours]) }
model Kudos    { wearId; userId; createdAt  @@id([wearId, userId]) }
model Comment  { id; wearId; userId; body String @db.VarChar(1000); createdAt; deletedAt DateTime?
                 @@index([wearId, createdAt]) }
model Follow   { followerId; followeeId; createdAt  @@id([followerId, followeeId])  @@index([followeeId])
                 /* CHECK (followerId <> followeeId) via raw SQL in the migration */ }
model Club     { id; slug @unique; name; description; createdById?; createdAt }
model ClubMembership { clubId; userId; role ADMIN|MEMBER; joinedAt  @@id([clubId, userId]) @@index([userId]) }
model Challenge { id; slug @unique; title; kind ChallengeKind; target Int; windowDays Int @default(30);
                  clubId String? /* null = global */; startsAt?; endsAt? }
```

Why this shape:

- **`@@map` instead of a table rename.** Vercel runs `migrate deploy` before the new build goes live, so for a minute or two the old deployment serves traffic against the new schema. With `@@map` the tables keep their names and that window is harmless. A physical rename can follow later as a metadata-only `ALTER TABLE … RENAME`.
- **The weather snapshot stays inline on `Wear`.** It's strictly 1:1, immutable and always read with the wear. A separate table would add a join and gain nothing.
- **`Wear.timeZone` snapshot.** A wear logged in Tokyo stays on its Tokyo day even after the user moves home. The streak rule uses each wear's own zone for its local date and the user's **current** zone for "today".
- **Pending check-in prompts are derived, not stored.** A prompt is due when `wornAt + offset ≤ now`, there is no check-in at that offset, and no earlier `GONE`. That keeps check-ins to one table with no scheduler state. If push is approved, a `PushSubscription` table is added then.
- **Challenge progress is derived** from wears in a rolling 30-day window (spec rule), so there's no participation table. `startsAt`/`endsAt` are optional so dated events can be added later without a migration.
- **`Wear.fragranceId` stays** even though wears now come from an owned item. It survives item deletion, and "unique scents / houses" counts need it.
- **`visibility` on each wear**, defaulting to the user's `defaultVisibility`. The feed shows `PUBLIC` wears plus `FOLLOWERS` wears from people you follow, and never `PRIVATE`.
- **Photos store a key, not a URL**, served via short-lived signed URLs or a proxy route that checks visibility. Otherwise a `PRIVATE` wear's photo would leak through a guessable URL.

---

## 4. Derived-stat rules (pure, in `src/modules/analytics`)

All take plain data plus an explicit `now`/`today` and never read the clock or the DB.

| Function                                               | Contract                                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `localDate(utc, tz)`                                   | `YYYY-MM-DD` in `tz` via `Intl.DateTimeFormat` (no new dependency). DST-safe.                                                               |
| `currentStreak(wearDates, today)`                      | Count of consecutive local days with ≥1 wear, ending today **or** yesterday; 0 otherwise. Duplicates ignored.                               |
| `untouched(items, lastWornByItem, today, days=30)`     | Owned (`kind ≠ WISHLIST`) items never worn, or last worn ≥30 local days ago. Sorted never-worn first, then oldest.                          |
| `challengeProgress(wears, kind, today, windowDays=30)` | Count of distinct `fragranceId` (or `brandId`) among wears whose local date is within the last 30 days, today inclusive.                    |
| `costPerWearMinor(price, wears)`                       | Existing; `null` for 0 wears (shown as "—") or no price. Wishlist excluded.                                                                 |
| `pickForToday(items, lastWornByItem)`                  | Least recently worn owned item. Never-worn first; empty bottles (`remainingMl = 0`) excluded; ties broken by oldest `createdAt`.            |
| `checkInsDue(wear, checkIns, now)`                     | Offsets in {2,4,8} that are due, not recorded, and not after a `GONE`. Each prompt stays open until the next offset (the 8h one until 24h). |
| `checkInSummary(checkIns)`                             | E.g. "Strong 2h · Faint 4h · Gone by 8h" for feed cards.                                                                                    |
| `toDisplayTemp / toDisplayVolume`                      | °C→°F, ml→fl oz by `UnitSystem`; storage always metric.                                                                                     |
| `accordBreakdown(wears, accordsByFragrance)`           | Wear-weighted share per accord (reuses the existing aggregation).                                                                           |

Each function gets fixture tests, including DST transitions, zone changes, a wear at 23:30 local / 00:30 the next day, and empty input.

---

## 5. Weather provider

Behind `interface WeatherService { current(lat, lon): Promise<WeatherSnapshot | null> }` in `src/modules/weather`, chosen by env (`WEATHER_PROVIDER`).

| Provider                                       | Terms (as checked 2026-10-25)                                                                                                                                                                                                                                                                  | Fit                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Open-Meteo** (current)                       | Free API is **non-commercial only**; < 10k calls/day, 5k/h, 600/min; data CC BY 4.0, must show "Weather data by Open-Meteo.com" next to displayed data. Commercial use needs a paid plan or self-hosting.                                                                                      | Ideal while non-commercial; zero code change    |
| **MET Norway** (`api.met.no` Locationforecast) | Free; data CC BY 4.0 (credit "Data from MET Norway"); **must send an identifying User-Agent with contact info** or risk being blocked; must cache and honour `Expires` / `If-Modified-Since`. No paid tier needed for commercial use as far as I could find (confirm on their licensing page). | Drop-in if Frag Avenue is or will be commercial |

**Recommendation:** ship Open-Meteo as the default implementation now, and add the MET Norway implementation behind the same interface if the answer to Q2 is "commercial". Either way: round coordinates to 2 decimals (~1 km) before sending, store no coordinates on the wear (the city-level weather is enough), and render the attribution on wear detail and feed cards.

## 6. Web Push (stretch): constraints verified

- iOS/iPadOS 16.4+ supports Web Push **only for Home Screen web apps**. It doesn't work in a Safari tab, and permission can only be requested from a user gesture (a "Remind me" button).
- Declarative Web Push (iOS 18.4+) can show notifications without service-worker JS; standard push still needs the SW `push` handler. We'd send standard payloads that also satisfy the declarative format.
- One unverified source claims push is unavailable in the EU on iOS 17.4+. Treat it as unconfirmed.
- **Scheduling is the real blocker.** Reminders at +2h/+4h/+8h need minute-level jobs. Vercel **Hobby cron is once a day** (with ±59 min precision); Pro allows per-minute. Options: Vercel Pro cron (`* * * * *` scanning due check-ins), or a delayed-message queue (e.g. Upstash QStash, one message per prompt). Both add cost or a vendor, so this stays a stretch phase pending Q5.
- The in-app prompt (a banner on Feed and the wear page when a check-in is due) works everywhere with no scheduler. That is the MVP.

---

## 7. Phases

One commit per phase on `main` (see Q6), tagged `pre-refactor` before Phase 1. After each phase: typecheck, lint, unit tests, plus e2e where Postgres is available; then a summary, and I wait for your go-ahead.

| Phase                        | Scope                                                                                                                                                                                                                                                                                                                                                                              | Leaves the old app working?                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **P1 Data + domain core**    | Additive migration (§3) with backfills; `@@map` renames in Prisma models and module code; time-zone capture (sign-up, settings, each wear); env validation wired; all §4 pure functions + tests; `DATA_MODEL.md`, `PRODUCT.md`, `CLAUDE.md` updated. No new screens.                                                                                                               | Yes. Same routes, same UI                   |
| **P2 Design system + shell** | Greyscale tokens + one `--accent`; AA-checked; 44px targets; 5-tab nav with centre "+"; `/feed`, `/wardrobe`, `/log`, `/stats`, `/clubs` routes. Tabs not yet built link to their legacy page. Manifest `start_url` → `/feed`.                                                                                                                                                     | Yes. Legacy pages restyled, still reachable |
| **P3 Wardrobe**              | List with type filter (bottle/decant/sample/wishlist), price, fill level, wear count, CPW; add/edit/delete; catalogue search + "submit missing fragrance" (`PENDING`, visible only to its submitter). Redirect `/collection*`.                                                                                                                                                     | Yes                                         |
| **P4 Log + check-ins**       | Pick owned item → sprays 1–10, occasion, mood, note, photo, visibility; `WeatherService` auto-snapshot; in-app 2/4/8h check-ins with GONE stop; wear detail/edit; redirect `/wear*`. Photo upload ships here if Q3 is answered, otherwise as P4b.                                                                                                                                  | Yes                                         |
| **P5 Feed + social**         | Feed (own + followed, visibility-filtered, cursor-paginated), wear cards (scent, sprays, occasion, temp, check-in summary, kudos toggle, comment count), comments, follow/unfollow, `/u/[username]`, username prompt for existing users, "Pick for today" card. Redirect `/dashboard`.                                                                                             | Yes                                         |
| **P6 Stats**                 | Total wears, unique scents, day streak, most worn, accord breakdown, 30+ days untouched, perf-vs-weather placeholder. Redirect `/insights`.                                                                                                                                                                                                                                        | Yes                                         |
| **P7 Clubs + challenges**    | Club list/detail, join/leave, the two seeded challenges with live progress.                                                                                                                                                                                                                                                                                                        | Yes                                         |
| **P8 Cleanup + DoD**         | Delete legacy pages, `advisor`/`recommendations`, unused insights code, RHF deps; PNG icons + iOS touch icon; seed rewrite (users, follows, clubs, wears); README, `CLAUDE.md`, `frag-domain` skill; Playwright: sign in, add to wardrobe, log a wear, check in, kudos, join club; installability check. Legacy DB columns stay (dropping them is a separate, approved migration). | Replacement complete                        |
| P9 (stretch) Web Push        | `PushSubscription` table, SW `push`/`notificationclick`, opt-in from a gesture, scheduler per Q5.                                                                                                                                                                                                                                                                                  | —                                           |

## 8. Data migration strategy

1. **Before P1:** tag `pre-refactor`. If production has real data, take a `pg_dump` of production first (you run it, or give me a direct URL; I never touch prod creds otherwise).
2. **Expand only.** Every migration in P1–P8 adds tables, nullable columns, or columns with defaults. Nothing is dropped, renamed physically, or narrowed. Prisma's generated SQL is hand-reviewed; any `DROP` is rejected.
3. **Backfills in the same migration, idempotent SQL:**
   - `CollectionItem.kind = 'DECANT' WHERE condition = 'DECANT'`, otherwise `BOTTLE`.
   - `WearLog.timeZone = User.timezone` (all `UTC` today, so historic day bucketing is unchanged from current behaviour; users can correct their zone in settings and it applies going forward).
   - `WearLog.visibility = 'PRIVATE'` for **all** existing rows; new wears use `User.defaultVisibility`.
   - `Fragrance.status = 'APPROVED'` (column default).
   - `bottleSizeMl` loosened to nullable (relaxing a constraint is non-destructive).
4. **Usernames:** nullable column; existing users get a one-time prompt; feed/profile features require one.
5. **Sprays > 10 on old rows** are left as is and displayed truthfully; only new and edited wears are validated 1–10.
6. **Contract later, with approval:** dropping legacy columns (`environment`, `longevityHours`, `projection`, `enjoyment`, `condition`) or physically renaming tables only after P8 ships and you approve, never in the same deploy as the code that stops using them.
7. **Rollback:** each phase is one commit, so `git revert` restores code; every migration is additive, so the old code runs against the new schema and a DB rollback is never required.

## 9. Risks

| Risk                                                                    | Mitigation                                                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Privacy regression: old private journal entries appear in the feed      | Backfill `PRIVATE`; feed query has a dedicated authorization test; photos served via visibility-checked access |
| Migration runs before the new build is live (Vercel)                    | Additive-only + `@@map`; old code tolerates new columns                                                        |
| Time-zone bugs in streaks (DST, travel, midnight)                       | Pure functions with explicit `now`, per-wear zone snapshot, DST fixtures                                       |
| Open-Meteo terms breach if commercial                                   | `WeatherService` + MET Norway implementation; attribution rendered                                             |
| Photo storage adds a vendor, cost, and a leak vector                    | Private bucket + signed URLs; size/type validation; strip EXIF GPS client-side before upload                   |
| Social endpoints abused (comment spam) with a per-instance rate limiter | Per-user limits on comment/kudos/follow; shared-store limiter tracked as post-MVP debt                         |
| E2E suite tied to legacy pages                                          | Specs migrated per phase alongside their redirects                                                             |
| Catalogue licensing                                                     | No scraping; seed only from a licence-compatible source (Q1); user submissions moderated                       |
| Scope creep from the deleted Advisor                                    | Code stays recoverable from `pre-refactor`; weather ranking documented as post-MVP                             |

## 10. Open questions (answered — see §11)

1. **Catalogue seed source.** Options I'd consider licence-safe: **(a)** Wikidata perfume items (CC0; brand, name, year, sometimes perfumer; no accords or notes), **(b)** Open Beauty Facts perfume category (ODbL share-alike + attribution; barcodes and brands, thin on notes), **(c)** first-party hand curation of ~100 popular fragrances (names and houses are facts; we write accord tags ourselves) plus user submissions. Kaggle "Fragrantica" dumps are scraped and excluded. _My recommendation: (a) for houses and names + (c) for accords on a starter set._ Which do you want?
2. **Is Frag Avenue commercial** (ads, subscriptions, a company behind it), now or soon? If yes, Open-Meteo's free API is off-limits and I'll implement MET Norway as the default.
3. **Photo storage.** Vercel Blob (simplest on Vercel; note a private-access mode is needed so private wears' photos don't leak), Cloudflare R2 / S3 (cheapest, S3 SDK), or defer photos to after the MVP?
4. **Does production hold real user data** beyond your own account? This decides whether I ask for a `pg_dump` before P1 and how cautious the username/visibility rollout must be.
5. **Web Push:** are you on Vercel Pro (per-minute cron), willing to add a queue (QStash), or should push stay unscheduled for now with in-app prompts only?
6. **Branch policy conflict.** Your ground rules say commit straight to `main`; this session is configured to push to `ccr-2ca40e80-nhtn42`, and `CLAUDE.md` says never push without being asked. Should I commit each phase to `main` (and push the `pre-refactor` tag), or commit to the session branch and you merge? Phase 0 is pushed to the session branch only.
7. **Default visibility for new wears:** `FOLLOWERS` (my recommendation, Strava-like) or `PUBLIC`? And are follows open (anyone can follow), or approval-based for private accounts? I'd ship open follows in the MVP.

Non-blocking defaults I'll use unless you object: delete Advisor/recommendations in P8; the accent colour is a single blue-violet token (`#4f46e5`, AA on white); mood list as in §3; clubs are user-creatable (any user can create a club and becomes its admin).

## 11. Decisions (2026-10-25)

| #   | Question                     | Decision                                           | Effect on the plan                                                                                                                                  |
| --- | ---------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Catalogue seed               | **Wikidata** (CC0) for now                         | P8 seed imports houses/names/years from Wikidata; accords stay first-party curated.                                                                 |
| 2   | Commercial?                  | **Personal project for now**                       | Keep **Open-Meteo** as the `WeatherService` default, with attribution. Revisit (MET Norway) if that changes.                                        |
| 3   | Photos                       | **After the MVP**                                  | No photo column, upload, or storage vendor in P4. CSP stays as is.                                                                                  |
| 4   | Real data in production?     | **Unsure**                                         | Treat production as holding real data: expand-only migrations, legacy wears `PRIVATE`, and take a `pg_dump` before pushing a migration if possible. |
| 5   | Web Push scheduling          | **Not on Vercel Pro**                              | Hobby cron is once a day, so push reminders need a queue (e.g. QStash) or stay out. In-app prompts are the MVP; P9 needs a fresh decision.          |
| 6   | Branch                       | **`main`**, one commit per phase                   | Tag `pre-refactor` at `865fc45`. Pushing to `main` deploys and runs `migrate deploy` on production.                                                 |
| 7   | Follows / default visibility | **Open follows**; default visibility not specified | Open follows. New wears default to `FOLLOWERS` (my recommendation; easy to change via `User.defaultVisibility`).                                    |

### Phase 1 deviations from §3 / §7

- `WardrobeItem.bottleSizeMl` stays non-null until wishlist entries ship in P3, so the legacy UI does not need null handling it would never exercise.
- `Wear.photoKey` dropped (decision 3).
- `Wear.visibility` gets a column default of `PRIVATE` (not just a backfill), so the legacy form, which does not set it, also writes private wears during the transition.
- Legacy wears get `timeZone = 'UTC'` rather than `User.timezone`. They are equal today, and `UTC` is the correct reading: the old form parsed the typed wall-clock time on a UTC server.
- The check-in schedule lives in `src/modules/wear-logs/check-ins.ts` (wear domain), not `analytics`. `dueCheckIn` returns the single open prompt.
- Fixed in passing: the legacy log/edit forms parsed and displayed `datetime-local` values in the server's zone (UTC in production). They now use the user's zone (new wears) or the wear's zone (edits).

### Phase 2 notes

- Tokens: greyscale ramp + `--accent-color` (#4f46e5 light / #a5b4fc dark), AA-verified; legacy token names (`--brand`, `--accent-amber`, …) alias onto them so legacy pages restyle without edits. The serif is dropped; `font-serif` resolves to the sans.
- Fixed in passing: global `button { color: inherit }` sat outside any CSS layer and overrode every Tailwind text colour on buttons (dark text on the primary button). Base rules now live in `@layer base`.
- `/feed`, `/wardrobe`, `/log`, `/stats` authenticate, then forward to `/dashboard`, `/collection`, `/wear/new`, `/insights`; `/clubs` is a placeholder. Sign-in, sign-up, the landing page, and the PWA `start_url` go to `/feed`.
- Legacy pages: every target ≥ 44px, red removed (errors and delete buttons are ink), horizontal overflow at 390px fixed on the landing page and Insights.
- Not yet greyscale, by plan: the bottle illustrations keep their curated colours until the Wardrobe rebuild (P3). The marketing landing page was removed at the user's request (2026-10-25): `/` redirects to `/sign-in` (or `/feed` when signed in), and the auth screens show only the app name and the form.

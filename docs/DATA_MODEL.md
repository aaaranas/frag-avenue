# Frag Avenue — Data Model

Authoritative reference. If code and this doc disagree, one of them is wrong — reconcile before shipping.

## Entities

### User

Auth.js core fields (`id`, `email`, `emailVerified`, `name`, `image`) plus:

- `passwordHash: String?` — nullable to allow magic-link users later.
- `username: String?` (unique) — public handle. Nullable only so pre-social accounts could be migrated; new accounts are asked for one.
- `bio: String?`
- `timezone: String` — IANA zone, default `"UTC"`. Captured from the browser at sign-up, editable on the profile, and offered by the shell nudge when the device disagrees. Defines "today" for streaks; snapshotted onto each new wear.
- `units: UnitSystem` (`METRIC | IMPERIAL`) — display only; storage is always metric.
- `defaultVisibility: Visibility` — applied to wears from the new log flow (default `FOLLOWERS`).
- `defaultCurrency: String` — ISO 4217, default `"PHP"`.
- `createdAt`, `updatedAt`.

Owns: `WardrobeItem[]`, `Wear[]`, `CheckIn[]`, `Kudos[]`, `Comment[]`, `Follow[]` (both directions), `ClubMembership[]`, Auth.js `Account[]`, `Session[]`.

### Brand

Canonical house / brand.

- `id`, `name` (unique), `slug` (unique), `createdAt`.

### Fragrance

Canonical fragrance. Shared across users.

- `id`, `brandId → Brand`, `name`, `slug` (unique per brand: `@@unique([brandId, slug])`).
- `concentration: Concentration` (enum: `PARFUM | EDP | EDT | EDC | COLOGNE | EXTRAIT | OTHER`).
- `releaseYear: Int?`
- `perfumer: String?`
- `gender: GenderClass` (enum: `MASCULINE | FEMININE | UNISEX`).
- `imagePath: String?` (`VarChar(200)`) — product photo served from `public/catalog/` (CHECK: `^/catalog/[a-z0-9-]+\.(jpg|jpeg|png|webp)$`, never an external URL). Null → the UI draws an outline glyph.
- `status: CatalogStatus` (`APPROVED | PENDING | REJECTED`, default `APPROVED`) — user submissions start `PENDING` and are visible only to their submitter until approved.
- `submittedById → User?` (`onDelete: SetNull`).
- `createdAt`, `updatedAt`.

The catalogue is our own table. It is never scraped from Fragrantica, Parfumo, or any site against its terms; seed data comes from licence-compatible sources: the curated `prisma/data/catalogue.csv` and Wikidata (CC0) through the committed snapshot `prisma/data/wikidata-catalogue.json` (create-only; concentration `OTHER`, since Wikidata does not say). Both are applied by `pnpm catalog:apply` (`prisma/catalogue.ts`) on every deploy and by the seed.

Curated bottle appearance (legacy): all nullable; shape and colour only,
deliberately not logos, label artwork, or trade dress.

- `bottleShape: BottleShape?` (enum: `RECTANGULAR | FLASK | CYLINDRICAL | TAPERED | SQUAT`).
- `glassColor: String?` — `#rrggbb`, `VarChar(7)`. On a `CLEAR` bottle this describes the juice; otherwise the glass.
- `capColor: String?` — `#rrggbb`, `VarChar(7)`.
- `glassFinish: GlassFinish?` (enum: `CLEAR | FROSTED | OPAQUE`).

Legacy since Phase 8: the bottle renderer that read these columns was retired
with the Advisor. The seed still writes them and nothing reads them; dropping
them needs a separate, approved migration.

### Note

Canonical scent note (e.g. "bergamot", "oud").

- `id`, `name` (unique), `slug` (unique).

### FragranceNote

Join between `Fragrance` and `Note` with layer.

- `fragranceId`, `noteId`, `layer: NoteLayer` (enum: `TOP | MIDDLE | BASE`).
- `@@id([fragranceId, noteId, layer])`
- `@@index([noteId])`

### Accord

Higher-level scent family (e.g. "fresh", "woody-aromatic").

- `id`, `name` (unique), `slug` (unique).

### FragranceAccord

Join with strength.

- `fragranceId`, `accordId`, `strength: Int` (1–5).
- `@@id([fragranceId, accordId])`
- `@@index([accordId])`

### WardrobeItem (table `CollectionItem`)

A user's bottle, decant, sample, or wishlist entry. The Prisma model was renamed from `CollectionItem` with `@@map`, so the table keeps its name (see "Renames" below).

- `id`, `userId → User (onDelete: Cascade)`, `fragranceId → Fragrance (onDelete: Restrict)`.
- `kind: ItemKind` (`BOTTLE | DECANT | SAMPLE | WISHLIST`, default `BOTTLE`). `WISHLIST` items are not owned: excluded from wear pickers, cost per wear, "untouched", and "pick for today".
- `bottleSizeMl: Int?` — required by the app for owned kinds, optional for `WISHLIST`. CHECK `> 0` when present.
- `remainingMl: Int?` — fill level is `remainingMl / bottleSizeMl`; null means unknown, not empty.
- `purchasePriceMinor: Int?` — money as integer minor units.
- `currency: String?` — ISO 4217; required when `purchasePriceMinor` is set (application-validated).
- `purchaseDate: DateTime?`, `purchaseSource: String?`, `batchCode: String?`
- `condition: BottleCondition` (`NEW | USED | DECANT`) — legacy; superseded by `kind`.
- `personalRating: Int?` (1–5), `personalNotes: String?`
- `createdAt`, `updatedAt`.
- `@@index([userId])`, `@@index([userId, fragranceId])`

### Wear (table `WearLog`)

One application of a fragrance. Model renamed from `WearLog` with `@@map`.

- `id`, `userId → User (onDelete: Cascade)`, `fragranceId → Fragrance (onDelete: Restrict)`.
- `collectionItemId → WardrobeItem?` (`onDelete: SetNull`). The new log flow always picks an owned item; legacy wears may have none (samples/borrows). `fragranceId` is kept on the wear so it survives item deletion and powers "unique scents/houses".
- `wornAt: DateTime` — UTC instant.
- `timeZone: String` — IANA zone the wear was logged in (default `"UTC"`). The wear's **day** is its local date in this zone. Immutable after create. Legacy rows are `UTC`: the old form parsed the typed wall-clock time on a UTC server, so `UTC` keeps them on the day the user entered.
- `sprays: Int` — 1–10 for new and edited wears (legacy rows may be up to 20).
- `occasion: Occasion` (`WORK | CASUAL | EVENING | FORMAL | SPORT | DATE | OTHER`).
- `mood: Mood?` (`CONFIDENT | RELAXED | HAPPY | COZY | FOCUSED | ROMANTIC | ENERGETIC | OTHER`).
- `visibility: Visibility` (`PUBLIC | FOLLOWERS | PRIVATE`). The column default is `PRIVATE`, so every pre-social wear, and any write that doesn't set it, stays private. The new log flow sets it explicitly from `User.defaultVisibility`.
- `notes: String?`
- Weather snapshot, inline because it is strictly 1:1, immutable, and always read with the wear: `temperatureC: Float?`, `humidityPct: Int?`, `weatherCondition: String?`, `weatherSource: WeatherSource` (`AUTO | MANUAL | NONE`), `weatherProvider: String?` (e.g. `"open-meteo"`, drives attribution; `"static"` marks test data), `weatherObservedAt: DateTime?` (the hour the reading applies to). Filled server-side by `WeatherService.snapshot(coords, wornAt)` from coordinates the browser sends rounded to 2 decimals; no coordinates are stored. `weatherSource` is `AUTO` for these, `NONE` when no snapshot.
- Legacy, read-only, hidden from new UI (superseded by check-ins): `environment`, `longevityHours`, `projection`, `enjoyment`.
- `createdAt`, `updatedAt`.
- `@@index([userId, wornAt])` — journal, profile, and time-window stats.
- `@@index([userId, fragranceId])` — per-fragrance counts.

### CheckIn

"How is it doing?" at 2h, 4h, 8h after a wear.

- `id`, `wearId → Wear (Cascade)`, `userId → User (Cascade)`, `offsetHours: Int` (CHECK `IN (2, 4, 8)`), `result: CheckInResult` (`STRONG | FAINT | GONE`), `recordedAt`.
- `@@unique([wearId, offsetHours])`, `@@index([userId])`.
- Pending prompts are **derived**, not stored (`dueCheckIn` in `src/modules/wear-logs/check-ins.ts`): each prompt is open from its offset until the next one (the 8h prompt until 24h), closes once answered, and none opens after a `GONE`.

### Kudos

- `@@id([wearId, userId])`, `createdAt`, both `Cascade`. `@@index([userId])`.

### Comment

- `id`, `wearId → Wear (Cascade)`, `userId → User (Cascade)`, `body: VarChar(1000)`, `createdAt`, `deletedAt?` (soft delete; body cleared).
- `@@index([wearId, createdAt])`, `@@index([userId])`.

### Follow

Open follows: anyone can follow anyone.

- `@@id([followerId, followeeId])`, `createdAt`, both `→ User (Cascade)`. CHECK `followerId <> followeeId`.
- `@@index([followeeId])` — "who follows me" / feed fan-in.

### Club / ClubMembership

- `Club`: `id`, `slug` (unique), `name`, `description?`, `createdById → User? (SetNull)`, timestamps.
- `ClubMembership`: `@@id([clubId, userId])`, `role: ClubRole` (`ADMIN | MEMBER`), `joinedAt`. `@@index([userId])`.

### Challenge

- `id`, `slug` (unique), `title`, `description?`, `kind: ChallengeKind` (`UNIQUE_FRAGRANCES | UNIQUE_HOUSES`), `target: Int` (CHECK `> 0`), `windowDays: Int` (default 30, CHECK `> 0`), `clubId → Club? (Cascade)` — null for a global challenge.
- Progress is **derived** from the user's wears in the rolling `windowDays` window ending today, so there is no participation table.

## Enums

`Concentration`, `GenderClass`, `NoteLayer`, `BottleCondition`, `BottleShape`, `GlassFinish`, `Occasion`, `Environment`, `WeatherSource`, `ItemKind`, `Mood`, `Visibility`, `CheckInResult`, `CatalogStatus`, `ChallengeKind`, `UnitSystem`, `ClubRole`.

## Auth.js tables

`Account`, `Session`, `VerificationToken` per Auth.js Prisma adapter — schema fields not repeated here; kept in `prisma/schema.prisma` as canonical.

## Deferred (not in the schema yet)

- `Purchase` — separate history of purchase events per collection item. Only add when we have a real "sold my bottle / bought a decant" flow.
- `UserPreference` — explicit preferences (e.g. blocked accords). Deferred; preferences are inferred from wears first.
- `PushSubscription` — Web Push endpoints. Added only if push reminders for check-ins are approved (needs a per-minute scheduler; see `docs/refactor-plan.md`).
- Wear photos — deferred until after the MVP.

Adding a table "because we might need it" is a bug. Add it when a real query needs it.

## Money, time, and unit invariants

- Money: integer minor units + ISO 4217 code, both columns or neither.
- Time: instants are UTC in the DB. A wear's day is its local date in `Wear.timeZone`; "today" is the local date in the user's current `User.timezone`. Conversions live in `src/lib/time-zone.ts`; never use `Date#getHours()`/`getDate()` (server-local) on user data.
- Units: stored metric (°C, ml); converted for display by `src/lib/units.ts` according to `User.units`.

## Renames and migrations

Migrations are **expand-only**: they add types, tables, nullable or defaulted columns, indexes, and constraints, and never drop, rename, or narrow in the same release as the code change. Vercel applies migrations before the new build takes traffic, so the previous build must keep working against the new schema.

Model renames use `@@map` so the table name is unchanged (`WardrobeItem` → `CollectionItem`, `Wear` → `WearLog`). A physical rename, and dropping legacy columns (`environment`, `longevityHours`, `projection`, `enjoyment`, `condition`), are separate, explicitly approved migrations after the code no longer uses them.

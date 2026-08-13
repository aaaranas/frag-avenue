# Frag Avenue — Data Model

Authoritative reference. If code and this doc disagree, one of them is wrong — reconcile before shipping.

## Entities

### User

Auth.js core fields (`id`, `email`, `emailVerified`, `name`, `image`) plus:

- `passwordHash: String?` — nullable to allow magic-link users later.
- `timezone: String` — IANA tz, default `"UTC"`.
- `defaultCurrency: String` — ISO 4217, default `"USD"`.
- `createdAt`, `updatedAt`.

Owns: `CollectionItem[]`, `WearLog[]`, Auth.js `Account[]`, `Session[]`.

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
- `createdAt`, `updatedAt`.

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

### CollectionItem

A user's ownership of a specific bottle.

- `id`, `userId → User (onDelete: Cascade)`, `fragranceId → Fragrance (onDelete: Restrict)`.
- `bottleSizeMl: Int` (positive).
- `remainingMl: Int?` (nullable; when null, treat as unknown, not zero).
- `purchasePriceMinor: Int?` — money as integer minor units.
- `currency: String?` — ISO 4217; required when `purchasePriceMinor` is set (application-validated).
- `purchaseDate: DateTime?`
- `purchaseSource: String?`
- `batchCode: String?`
- `condition: BottleCondition` (enum: `NEW | USED | DECANT`).
- `personalRating: Int?` (1–5).
- `personalNotes: String?`
- `createdAt`, `updatedAt`.
- `@@index([userId])`
- `@@index([userId, fragranceId])`

### WearLog

One act of wearing a fragrance.

- `id`, `userId → User (onDelete: Cascade)`, `fragranceId → Fragrance (onDelete: Restrict)`.
- `collectionItemId → CollectionItem?` — nullable so users can log samples/borrows.
- `wornAt: DateTime` (UTC).
- `sprays: Int` (1–20).
- `occasion: Occasion` (enum: `WORK | CASUAL | EVENING | FORMAL | SPORT | DATE | OTHER`).
- `environment: Environment` (enum: `INDOOR | OUTDOOR | MIXED`).
- `temperatureC: Float?`
- `humidityPct: Int?`
- `weatherCondition: String?` — free text short code from Open-Meteo mapping (e.g. `"clear"`, `"rain"`).
- `weatherSource: WeatherSource` (enum: `AUTO | MANUAL | NONE`).
- `longevityHours: Float?` (0.5 step, ≤ 24).
- `projection: Int?` (1–5).
- `enjoyment: Int?` (1–5).
- `notes: String?`
- `createdAt`, `updatedAt`.
- `@@index([userId, wornAt])` — powers the wear feed and time-window aggregations.
- `@@index([userId, fragranceId])` — powers per-fragrance analytics.

## Enums

`Concentration`, `GenderClass`, `NoteLayer`, `BottleCondition`, `Occasion`, `Environment`, `WeatherSource`.

## Auth.js tables

`Account`, `Session`, `VerificationToken` per Auth.js Prisma adapter — schema fields not repeated here; kept in `prisma/schema.prisma` as canonical.

## Deferred (not in v1 schema)

- `Purchase` — separate history of purchase events per collection item. Only add when we have a real "sold my bottle / bought a decant" flow.
- `UserPreference` — explicit preferences (e.g. blocked accords). Deferred; preferences are inferred from wears first.
- `RecommendationSnapshot` — persisted recommendation history. Deferred; recommendations are computed on demand until we have a reason to store them (feed history, A/B, etc.).

Adding a table "because we might need it" is a bug. Add it when a real query needs it.

## Money & time invariants

- Money: integer minor units + ISO 4217 code, both columns or neither.
- Time: UTC in DB, grouped in `User.timezone` at read time.

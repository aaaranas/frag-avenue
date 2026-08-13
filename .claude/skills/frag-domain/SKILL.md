---
name: frag-domain
description: Reusable Frag Avenue domain knowledge — fragrance terminology, canonical vs user-owned data separation, wear logging semantics, rating scales, analytics/cost-per-wear definitions, and cold-start recommendation rules. Load this before touching fragrance, collection, wear-log, analytics, or recommendation code.
---

# Frag Avenue domain reference

## Fragrance terminology

- **Fragrance** — a canonical, house-published product (e.g. "Parfums de Marly Layton EDP"). Shared across all users. Metadata: brand, name, concentration, release year, perfumer, gender classification, notes (top/middle/base), accords.
- **Concentration** — Parfum / EDP / EDT / EDC / Cologne / Extrait. Affects expected longevity and projection baselines.
- **Notes** — individual scent ingredients, structured in pyramid layers (top / middle / base). One fragrance has many notes.
- **Accords** — higher-level scent families / blends (e.g. "fresh", "woody-aromatic", "gourmand", "smoky", "aquatic"). Used as the primary feature vector for preference matching.
- **Perfumer** — the composer. Free text initially; do not model as a first-class entity until we have a query that needs it.
- **Batch code** — bottle-level identifier from the manufacturer; useful for authenticity and age tracking. Free text.

## Canonical vs user-owned data

The most important modelling rule in Frag Avenue.

- **`Fragrance`** = canonical, immutable-per-user. A user can propose a new fragrance, but they cannot edit brand/notes/accords in a way that would corrupt another user's data. Global corrections are an admin path (out of MVP scope — but the split must exist now).
- **`CollectionItem`** = a user's ownership of a specific bottle of a `Fragrance`. Bottle size, remaining volume, purchase price/date/source, personal rating, personal notes, condition. Deleting a collection item does not delete the underlying fragrance.
- Two users owning "Aventus" share one `Fragrance` row and each has their own `CollectionItem`.

## Wear logging semantics

- One `WearLog` = one act of applying a fragrance on a specific date/time.
- A wear is associated with a `Fragrance` (via a `CollectionItem` when the user owns it, but the schema stores the fragrance id so a user can log a sampled or borrowed wear without owning a bottle).
- Sprays count is an integer 1–20 (validate). Used to derive spray-based cost and depletion estimates.
- Environment is enum: `INDOOR | OUTDOOR | MIXED`.
- Weather (temperature °C, humidity %, condition) is captured at log time. If Open-Meteo provides values, they prefill; the user can always override. Store the source (`AUTO | MANUAL`) so analytics can weight quality of data.
- Performance metrics — longevity (hours), projection (1–5), enjoyment rating (1–5) — are the user's subjective post-wear assessment.

## Rating & scale conventions

- Personal ratings and enjoyment: **integer 1–5**. Never fractional in the schema.
- Projection: **integer 1–5** (1 = skin scent, 5 = room-filling).
- Longevity: **numeric hours, 0.5 step**, capped at 24.
- Recommendation confidence: **percentage 0–100**, rounded to the nearest integer for display.

## Analytics definitions (single source of truth)

- **Total wears** = count of `WearLog` rows for the user.
- **Estimated sprays** = Σ `WearLog.sprays`.
- **Collection value** = Σ `CollectionItem.purchasePriceMinorUnits` (in the user's display currency; store per-item currency, convert at read time; no FX inside inserts).
- **Total volume** = Σ `CollectionItem.bottleSizeMl`.
- **Cost per wear (per item)** = `purchasePrice / wearCount` where `wearCount ≥ 1`; undefined for zero wears (display as "—", not 0 or infinity).
- **Cost per wear (per user)** = Σ purchase prices of items with ≥1 wear / Σ wears of those items. Excludes zero-wear items so a large untouched collection does not distort the number.
- **Neglected fragrance** = owned ≥ 90 days AND last wear ≥ 60 days ago (or never worn).
- **Most worn** = top-N by wear count in the selected window (default: last 90 days).
- **Concentration ratio** = share of total wears represented by the top 5 fragrances. High values indicate low collection utilisation.
- **Seasonal pattern** = wears grouped by meteorological season derived from `WearLog.wornAt`.
- All aggregations respect the user's timezone (store timestamps as UTC, group in the user's tz).

## Cost-per-wear detail

Prices are stored as integer **minor units** with an ISO 4217 currency code. Never store money as a float. Division for CPW happens in the analytics module and rounds to two decimal places for display only.

## Recommendation terminology

- **Score** = weighted sum of sub-scores, all in [0, 1], multiplied by 100 for display.
- **Sub-scores** (initial hypothesis, not immutable):
  - `weatherFit` (30%) — how well the fragrance's accord profile matches current weather.
  - `preferenceFit` (25%) — cosine-ish similarity between the user's historically high-rated accord profile and this fragrance's accords.
  - `occasionFit` (20%) — occasion tag match (work / casual / evening / formal / sport / date).
  - `historicalPerformance` (15%) — the user's average enjoyment rating on this fragrance, Bayesian-shrunk toward the user's global mean when wear count is low.
  - `rotationDiversity` (10%) — penalizes fragrances worn recently to avoid over-recommending the same bottle.
- **Reasons** — every returned recommendation carries a `reasons: string[]` array generated from whichever sub-scores contributed most. Reasons are templated from the actual numbers, not free-form prose.

## Cold-start rules

A user is **cold-start** when any of:

- fewer than 10 total `WearLog` rows, OR
- fewer than 5 distinct fragrances worn, OR
- no rated wears (enjoyment) yet.

Cold-start behaviour:

- Do not compute `preferenceFit` or `historicalPerformance` — set their weights to 0 and re-normalize remaining weights.
- Do not display a percentage score. Display "Suggested" with a badge and a plain-language reason ("matches today's weather", "you haven't tried this yet in warm weather", etc.).
- Prefer variety: return one suggestion per distinct accord family the user owns.
- Never invent preferences the user has not expressed.

## Explainability principles

- Every score is decomposable into named sub-scores.
- Every reason string is derived from a real number, not from vibes.
- If two fragrances tie on score, break ties by lowest recent-wear count (encourage exploration), then alphabetical.
- Log the sub-score breakdown (in-memory, not to disk) so tests can assert the reasoning path.

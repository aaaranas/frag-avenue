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
- **`WardrobeItem`** (table `CollectionItem`) = a user's bottle, decant, sample, or wishlist entry for a `Fragrance`. `kind` (`BOTTLE | DECANT | SAMPLE | WISHLIST`), bottle size, remaining volume (fill level), purchase price/date/source, personal rating, personal notes. Deleting it does not delete the underlying fragrance. **Wishlist items are not owned.**
- Two users owning "Aventus" share one `Fragrance` row and each has their own `WardrobeItem`.
- Users can submit missing fragrances; submissions are `PENDING` (visible only to the submitter) until moderated. The catalogue is never scraped from third-party sites.

## Wear logging semantics

- One `Wear` (table `WearLog`) = one act of applying a fragrance at a specific instant. It stores `wornAt` (UTC) and `timeZone` (IANA zone it was logged in); its **day** is its local date in that zone.
- The new log flow picks an owned `WardrobeItem`; the wear also stores the fragrance id so it survives item deletion. Legacy wears may have no item (samples/borrows).
- Sprays count is an integer **1–10** for new and edited wears (legacy rows may hold up to 20).
- Occasion and mood are enums; note is optional. Photos are deferred until after the MVP.
- Visibility: `PUBLIC | FOLLOWERS | PRIVATE`. Pre-social wears are `PRIVATE`.
- Environment (`INDOOR | OUTDOOR | MIXED`), longevity, projection, and enjoyment are legacy fields, kept read-only and superseded by check-ins.
- Weather (temperature °C, humidity %, condition) is captured at log time. If Open-Meteo provides values, they prefill; the user can always override. Store the source (`AUTO | MANUAL`) so analytics can weight quality of data.
- **Check-ins** replace post-hoc performance ratings: at 2h, 4h, 8h after a wear the user answers Strong / Faint / Gone. Each prompt is open from its offset until the next opens (8h → until 24h); answered prompts close; nothing opens after Gone. Prompts are derived, not stored.

## Rating & scale conventions

- Personal ratings and enjoyment: **integer 1–5**. Never fractional in the schema.
- Projection: **integer 1–5** (1 = skin scent, 5 = room-filling).
- Longevity: **numeric hours, 0.5 step**, capped at 24.
- Recommendation confidence: **percentage 0–100**, rounded to the nearest integer for display.

## Analytics definitions (single source of truth)

Day rule for everything below: a wear's day is its local date in `Wear.timeZone`; "today" is the local date in the user's current `User.timezone`.

- **Day streak** = consecutive local days with ≥ 1 wear, ending today **or** yesterday (a streak survives until today ends); otherwise 0.
- **Unique scents** = distinct fragrances among the wears.
- **Most worn** = highest wear count; ties go to the most recently worn.
- **Accord breakdown** = share of wears by accord; each wear contributes weight 1, split across its fragrance's accords by strength. Wears of fragrances without accords are excluded.
- **Untouched** = owned (non-wishlist) items never worn, or last worn ≥ 30 local days ago.
- **Pick for today** = least recently worn owned item; never-worn first, then oldest-added; skip known-empty bottles (`remainingMl = 0`).
- **Challenge progress** = distinct fragrances (or houses) among wears whose local date is within the last 30 days, today inclusive.

- **Total wears** = count of `WearLog` rows for the user.
- **Estimated sprays** = Σ `WearLog.sprays`.
- **Collection value** = Σ `CollectionItem.purchasePriceMinorUnits` (in the user's display currency; store per-item currency, convert at read time; no FX inside inserts).
- **Total volume** = Σ `CollectionItem.bottleSizeMl`.
- **Cost per wear (per item)** = `purchasePrice / wearCount` where `wearCount ≥ 1`; undefined for zero wears (display as "—", not 0 or infinity) and for wishlist items.
- **Cost per wear (per user)** = Σ purchase prices of items with ≥1 wear / Σ wears of those items. Excludes zero-wear items so a large untouched collection does not distort the number.
- **Neglected fragrance** (legacy dashboard, replaced by _Untouched_) = owned ≥ 90 days AND last wear ≥ 60 days ago (or never worn).
- **Most worn** = top-N by wear count in the selected window (default: last 90 days).
- **Concentration ratio** = share of total wears represented by the top 5 fragrances. High values indicate low collection utilisation.
- **Seasonal pattern** = wears grouped by meteorological season derived from `WearLog.wornAt`.
- All aggregations respect time zones (store instants as UTC, bucket by each wear's local date). Legacy dashboard/insights still bucket in UTC until they are replaced.
- Units: store metric (°C, ml), convert for display only.

## Cost-per-wear detail

Prices are stored as integer **minor units** with an ISO 4217 currency code. Never store money as a float. Division for CPW happens in the analytics module and rounds to two decimal places for display only.

## Recommendation terminology (legacy Advisor — scheduled for removal; weather-ranked recommendations are out of MVP scope)

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

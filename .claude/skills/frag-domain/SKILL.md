---
name: frag-domain
description: Reusable Frag Avenue domain knowledge — fragrance terminology, canonical vs user-owned data separation, wear logging and check-in semantics, visibility, stats/cost-per-wear definitions, and challenges. Load this before touching fragrance, wardrobe, wear-log, social, clubs, or analytics code.
---

# Frag Avenue domain reference

## Fragrance terminology

- **Fragrance** — a canonical, house-published product (e.g. "Parfums de Marly Layton EDP"). Shared across all users. Metadata: brand, name, concentration, release year, perfumer, gender classification, notes (top/middle/base), accords.
- **Concentration** — Parfum / EDP / EDT / EDC / Cologne / Extrait. Affects expected longevity and projection baselines.
- **Notes** — individual scent ingredients, structured in pyramid layers (top / middle / base). One fragrance has many notes.
- **Accords** — higher-level scent families / blends (e.g. "fresh", "woody-aromatic", "gourmand", "smoky", "aquatic"). Weighted by strength (1–5) in the Stats accord breakdown.
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

## Analytics definitions (single source of truth)

Day rule for everything below: a wear's day is its local date in `Wear.timeZone`; "today" is the local date in the user's current `User.timezone`.

- **Day streak** = consecutive local days with ≥ 1 wear, ending today **or** yesterday (a streak survives until today ends); otherwise 0.
- **Unique scents** = distinct fragrances among the wears.
- **Most worn** = highest wear count; ties go to the most recently worn.
- **Accord breakdown** = share of wears by accord; each wear contributes weight 1, split across its fragrance's accords by strength. Wears of fragrances without accords are excluded.
- **Untouched** = owned (non-wishlist) items never worn, or last worn ≥ 30 local days ago.
- **Pick for today** = least recently worn owned item; never-worn first, then oldest-added; skip known-empty bottles (`remainingMl = 0`).
- **Challenge progress** = distinct fragrances (or houses) among wears whose local date is within the last 30 days, today inclusive.

- **Total wears** = count of the user's wears in the selected range (30 days, 90 days, or all time).
- **Cost per wear (per item)** = `purchasePrice / wearCount` where `wearCount ≥ 1`; undefined for zero wears (display as "—", not 0 or infinity) and for wishlist items.
- **Challenge leaderboard** = each member's challenge progress counting only the wears the _viewer_ may see (visibility rules below), each member's window ending on their own local today; sorted by count, ties share a rank.
- Stats and challenges are pure functions (`src/modules/analytics`) that take `today`/`now` as an argument; nothing derived is stored.
- Units: store metric (°C, ml), convert for display only.

## Cost-per-wear detail

Prices are stored as integer **minor units** with an ISO 4217 currency code. Never store money as a float. Division for CPW happens in the analytics module and rounds to two decimal places for display only.

## Visibility

- Owner sees all of their wears. Anyone signed in sees `PUBLIC`; followers also see `FOLLOWERS`; `PRIVATE` is owner-only.
- Follows are open (anyone can follow anyone). New wears default to `User.defaultVisibility` (initially `FOLLOWERS`).
- Every query returning wears to a non-owner uses the builders in `src/modules/social/visibility.ts`. Kudos and comments authorize through `findWearForInteraction`; you cannot kudos your own wear.

## Clubs and challenges

- A **club** is an open group: anyone can join or leave; its creator is its admin.
- **Challenges** are global (rows inserted by a data migration): "30 different scents in 30 days" and "5 different houses in 30 days". Progress is a rolling 30-local-day window; a club page shows a leaderboard per challenge for its members.

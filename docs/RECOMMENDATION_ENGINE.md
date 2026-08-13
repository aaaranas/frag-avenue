# Frag Avenue — Recommendation Engine

## Purpose

Answer "What should I wear?" with a ranked list of fragrances the user owns, each carrying a numeric score and an array of plain-language reasons derived from the actual sub-scores.

## Determinism

Every recommendation is a pure function of the inputs. Same inputs → same output. No randomness, no LLM narration, no online learning inside the request path.

```
recommend(user, weather, occasion, ownedFragrances, wearHistory, weights) -> Recommendation[]
```

## Sub-scores (all in [0, 1])

| Sub-score               | Weight (default) | Definition                                                                                                                                                                            |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weatherFit`            | 0.30             | Match between the fragrance's accord vector and the current weather bucket's ideal accord profile.                                                                                    |
| `preferenceFit`         | 0.25             | Similarity between the user's historically high-rated accord vector and this fragrance's accord vector.                                                                               |
| `occasionFit`           | 0.20             | Match between the requested occasion and the fragrance's occasion suitability (derived from user's own history when available, otherwise a small built-in default per accord family). |
| `historicalPerformance` | 0.15             | User's mean enjoyment for this fragrance, Bayesian-shrunk toward the user's global mean. `(sum + m * globalMean) / (n + m)`, default `m = 3`.                                         |
| `rotationDiversity`     | 0.10             | `1 - recencyPenalty`, where `recencyPenalty` decays over 14 days since last wear.                                                                                                     |

Weights sum to 1.0. They are inputs to the scoring function, not hardcoded — swap the weighting strategy without touching the UI.

## Final score

```
score = Σ (weight_i * subScore_i)
displayScore = round(score * 100)
```

Ties break by lowest recent-wear count (encourages exploration), then by fragrance name.

## Reasons

For each returned recommendation, take the top 2–3 sub-scores by (weight × subScore) contribution and emit a templated reason string per sub-score. Reasons are derived from numbers — never generated.

Examples:

- `weatherFit ≥ 0.75`: "strong match for today's {weatherBucket} weather"
- `historicalPerformance ≥ 0.8`: "you've rated this {avgRating}/5 across {n} wears"
- `rotationDiversity ≥ 0.7`: "you haven't worn this in {days} days"

## Cold start

A user is cold-start if any of:

- fewer than 10 total `WearLog` rows, OR
- fewer than 5 distinct fragrances worn, OR
- no wears with an `enjoyment` rating.

Cold-start behaviour:

- `preferenceFit` and `historicalPerformance` weights are set to 0 and the remaining weights are re-normalized so they still sum to 1.
- Do not display a percentage score. Display "Suggested" with a plain reason.
- Return one suggestion per distinct accord family the user owns, to prioritize variety.
- Never fabricate preferences.

## Testability

The scoring engine lives in `src/modules/recommendations` and imports nothing framework-specific. Unit tests cover:

- Cold-start user with 0 wears → variety-based output, no percentage.
- Mature user with a clear seasonal preference → correct top pick and reasons that name the driving sub-scores.
- Weight override → the same inputs produce a different ranking.
- Tie-break → the fragrance with fewer recent wears wins.
- Neglected fragrance surfaces when rotation diversity dominates.

## What this engine will not do (yet)

- No collaborative filtering (single-user recommendations only).
- No online learning.
- No LLM.
- No cross-user "similar users" comparisons.

These are future possibilities — see `docs/ROADMAP.md`.

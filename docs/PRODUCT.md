# Frag Avenue — Product

## Positioning

Frag Avenue is an intelligent fragrance wardrobe and personal fragrance analytics platform. It is not a social network, not a marketplace, and not a review aggregator. The defining feature is turning a user's longitudinal wear data into explainable, personalized fragrance intelligence.

## Core loop

Collect → Wear → Record → Learn → Recommend.

The most frequent user action is **logging today's wear**. The application is optimized around making that action fast on mobile.

## Questions the product should answer over time

- What should I wear today?
- Which of my fragrances actually perform best for me?
- What weather works best for each fragrance?
- What accord/profile do I consistently enjoy?
- Which bottles am I neglecting?
- What is my cost per wear, per bottle and overall?
- How diverse or redundant is my collection?
- Should I consider buying this fragrance?

## MVP scope (v1)

1. **Authentication** — Auth.js v5, credentials + email.
2. **Fragrance collection** — CRUD on user-owned collection items backed by a shared canonical `Fragrance` table.
3. **Wear journal** — log wears with weather (auto or manual), sprays, environment, occasion, and post-wear performance ratings.
4. **Dashboard** — key aggregate statistics.
5. **Scent intelligence** — deterministic insights derived from real calculations (neglected fragrances, cost per wear, seasonal patterns, etc.).
6. **Advisor** — "What should I wear?" — deterministic, explainable recommendation engine with a cold-start path.

## Explicitly out of scope for v1

Social features, marketplace, public reviews, AI chatbot, computer vision, barcode scanning, layering engine, native mobile app, ML microservice, Redis, microservices, event streaming, Kubernetes, large-scale scraping. Documented as possible futures in `docs/ROADMAP.md`.

## Non-goals of the design

- No fake precision. If the data does not support a number, the UI does not show a number.
- No LLM narration of ordinary statistics.
- No stereotypical AI-SaaS visual language (gradient explosions, glass everywhere, glowing bits, decorative charts).

## Success signal for the foundation

A new user can sign in, add three fragrances to their collection, log a wear with weather auto-filled, and see accurate totals on the dashboard — with no cross-user data leaks and no `any` types in the touched code.

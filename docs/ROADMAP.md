# Frag Avenue — Roadmap

## Foundation (this pass)

Repository scaffolding, Claude Code configuration, docs, Next.js + TypeScript strict, Prisma + Docker Compose Postgres, initial schema + seed, app shell + responsive nav, Vitest + Playwright wired, GitHub Actions CI, PWA manifest.

## Vertical slices (in order)

1. **Authentication** — Auth.js v5 credentials, sign-up, sign-in, session, `requireUser()` helper.
2. **Fragrance domain reads** — browse canonical fragrances (search-only initially; user-facing add-fragrance later).
3. **Collection CRUD** — add / edit / delete collection items linked to canonical fragrances.
4. **Wear logging** — create / edit / delete wear logs with sprays, occasion, environment, ratings.
5. **Weather enrichment** — Open-Meteo integration with geocoding + Zod validation + manual override.
6. **Dashboard** — accurate aggregate stats (owned, value, volume, wears, sprays, most/least worn, recent activity).
7. **Analytics** — accord distribution, seasonal patterns, concentration ratio, cost per wear.
8. **Scent Intelligence** — neglected fragrances, preferred accords, weather-rating correlations, house frequencies.
9. **Advisor** — deterministic recommendation engine with cold-start path and explanations.
10. **PWA polish** — service worker with scoped, non-authenticated caching; install prompt; offline-safe empty states.
11. **E2E hardening** — Playwright coverage of sign-in → add fragrance → log wear → see dashboard update.
12. **Production hardening** — rate limiting on auth, error boundaries, structured logging, security headers, backup strategy for the DB.

## Post-MVP futures (documented, not scheduled)

- Social layer (follow, share a wardrobe).
- Marketplace / decant exchange.
- Public community reviews.
- AI chat interface over the user's own data.
- Computer vision for bottle recognition.
- Barcode / batch-code lookup.
- Perfume layering suggestions.
- Native Expo/React Native client consuming the same server actions/API.
- Machine learning models for recommendation (once we have data and a real signal that determinism is insufficient).
- Redis for hot caches (only when a real bottleneck exists).
- Event streaming (only when we have events worth streaming).
- Kubernetes / microservices (only when the monolith is provably the bottleneck — probably never for this product).
- Large-scale fragrance metadata ingestion (requires legal review of source terms).

These exist to communicate that we know they exist. None are scheduled.

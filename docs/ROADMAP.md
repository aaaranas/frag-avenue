# Frag Avenue — Roadmap

## Where we are

The original foundation (auth, catalogue, collection, wear journal, weather,
dashboard, insights, advisor, PWA, hardening) shipped first. The product then
moved from personal analytics to a Strava-style social wear log; that
refactor is documented phase by phase in [`refactor-plan.md`](refactor-plan.md).
Phases 1–8 are done: data model, design system and five-tab shell, Wardrobe,
Log with check-ins, Feed and social, Stats, Clubs and challenges, and cleanup.

## Next

- **Phase 9 (stretch): Web Push** for check-in reminders. Needs a scheduler
  decision first: Vercel Hobby cron runs once a day, so reminders at 2/4/8h
  need a queue (e.g. QStash) or a different host.
- **Wikidata catalogue snapshot**: run `pnpm db:catalogue:fetch` from a
  machine with network access, review, commit, and seed.
- **Wear photos** (deferred until after the MVP): storage vendor, CSP
  `img-src`, and a photo column.
- **Shared rate-limit store** (Upstash / KV) before any real traffic.
- **Dropping legacy columns** (wear ratings, environment, bottle appearance)
  in a separate, approved, expand-then-contract migration.

## Post-MVP futures (documented, not scheduled)

- Marketplace / decant exchange.
- Public community reviews.
- AI chat interface over the user's own data.
- Computer vision for bottle recognition.
- Barcode / batch-code lookup.
- Perfume layering suggestions.
- Native Expo/React Native client consuming the same server actions/API.
- Weather-ranked recommendations (the retired Advisor; recoverable from the `pre-refactor` tag).
- Redis for hot caches (only when a real bottleneck exists).
- Event streaming (only when we have events worth streaming).
- Kubernetes / microservices (only when the monolith is provably the bottleneck — probably never for this product).
- Large-scale fragrance metadata ingestion (requires legal review of source terms).

These exist to communicate that we know they exist. None are scheduled.

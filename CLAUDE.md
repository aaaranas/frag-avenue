# Frag Avenue

Intelligent fragrance wardrobe and personal fragrance analytics PWA. Core loop: Collect → Wear → Record → Learn → Recommend. The differentiator is turning longitudinal wear data into explainable personal fragrance intelligence — not just collection tracking.

See `docs/PRODUCT.md` for product scope and `docs/ARCHITECTURE.md` for architectural rationale.

## Stack

- Next.js 15 (App Router, Server Components by default), React 19, TypeScript strict
- pnpm, Node 22 LTS
- Tailwind CSS 4, shadcn/ui, Recharts (only where charts communicate better than a stat card)
- PostgreSQL 16 (Docker Compose locally), Prisma 6
- Auth.js v5 (NextAuth v5) with Prisma adapter — credentials + email; targets Next 15 App Router
- Zod for validation, React Hook Form for complex forms
- Open-Meteo for weather/geocoding (no API key)
- Vitest + React Testing Library, Playwright for critical E2E
- GitHub Actions CI, Vercel-compatible deployment

Do not introduce new dependencies without checking they support the current Next 15 / React 19 runtime.

## Architecture rules

Modular monolith. Layer boundaries are enforced by convention:

```
src/app          UI / route composition (Server Components by default)
src/components   Presentational + shell UI
src/modules/*    Domain modules (auth, users, fragrances, collection, wear-logs,
                 weather, analytics, recommendations). Each module owns its
                 application services, domain logic, and data access.
src/lib          Cross-cutting infrastructure (prisma client, env, utils)
```

- React page components must NOT contain business logic or call Prisma directly. They call module services.
- Analytics and recommendation logic live in `src/modules/analytics` and `src/modules/recommendations` and must be pure and independently testable (no React, no Next imports).
- Weather fetching is isolated in `src/modules/weather` so a future native client can share the abstraction.
- Server-only code uses `import "server-only"` at the top of the file.
- Public server actions and route handlers MUST validate input with Zod and MUST authorize using the server session — never trust a client-supplied user id.

## Directory conventions

- Route groups: `src/app/(app)/*` for authenticated shell, `src/app/(auth)/*` for auth screens.
- Colocate component tests as `*.test.tsx`; pure logic tests as `*.test.ts`.
- Module public API is exported from `src/modules/<name>/index.ts` — other modules import only from there.

## Commands

- `pnpm dev` — Next.js dev server
- `pnpm build` / `pnpm start`
- `pnpm lint` / `pnpm format` / `pnpm typecheck`
- `pnpm test` (Vitest) / `pnpm test:e2e` (Playwright)
- `pnpm db:up` — start Postgres via docker compose
- `pnpm db:migrate` — apply migrations (dev)
- `pnpm db:seed` — seed dev data
- `pnpm db:studio` — Prisma Studio

## Testing expectations

- Every module with domain logic (analytics, recommendations, scoring, cost-per-wear) has unit tests targeting behavior, not implementation.
- Server actions have at least one happy-path and one authorization test.
- Playwright covers: sign in, add fragrance to collection, log a wear.

## Database safety

- Never run `prisma migrate reset`, `db push --force-reset`, or drop the database non-interactively. Ask first.
- Migrations are committed. `prisma db push` is only for throwaway prototyping.
- Every schema change goes through the `database-change` skill.

## Git safety

- Do not commit or push unless the user explicitly asks.
- Never force-push, reset --hard, clean -fd, or delete branches.
- Inspect `git status` before large changes; preserve unrelated modifications.

## Definition of done

A slice is done when: types pass, lint passes, tests pass, the feature works end-to-end in the browser, auth/authorization is verified, empty/loading/error states are handled, and the change touches only what the slice requires.

# Domain modules

Each module owns its data access, application services, and public API. Other modules import ONLY through `<module>/index.ts`.

Convention:

```
src/modules/<name>/
  index.ts       # public surface (re-exports) — client-safe: never re-exports a server-only file
  service.ts     # application / domain logic
  data.ts        # Prisma calls (thin, `import "server-only"`); server code imports it directly
  actions.ts     # server actions: Zod-validated, authorized from the session
  schema.ts      # Zod schemas for input validation
  *.test.ts      # colocated tests
```

Modules: `auth`, `users`, `fragrances`, `wardrobe`, `wear-logs`, `weather`, `social`, `clubs`, `analytics`.

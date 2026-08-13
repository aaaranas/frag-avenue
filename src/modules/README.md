# Domain modules

Each module owns its data access, application services, and public API. Other modules import ONLY through `<module>/index.ts`.

Convention:

```
src/modules/<name>/
  index.ts       # public surface (re-exports)
  service.ts     # application / domain logic
  data.ts        # Prisma calls (thin)
  schema.ts      # Zod schemas for input validation
  __tests__/     # optional colocated tests
```

Planned modules: `auth`, `users`, `fragrances`, `collection`, `wear-logs`, `weather`, `analytics`, `recommendations`.

Modules are added slice by slice — see `docs/ROADMAP.md`.

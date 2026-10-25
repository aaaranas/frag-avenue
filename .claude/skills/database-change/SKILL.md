---
name: database-change
description: Workflow for any change to prisma/schema.prisma or persistence behaviour. Use before touching the schema, seed, or a migration. Never resets shared or production data.
---

# Database-change workflow

Any schema or persistence change goes through this checklist. No exceptions.

## 1. Inspect current state

- Read `prisma/schema.prisma` in full. Do not skim.
- Read `docs/DATA_MODEL.md` — if the change contradicts it, update the doc as part of this slice.
- Check `prisma/migrations/` for the last few migrations to understand recent history.
- Run `git status` — never bury an unrelated in-progress schema edit.

## 2. Backward compatibility

For every change, answer explicitly:

- Is this additive (safe) or destructive (renames, drops, type changes)?
- Are there existing rows? What happens to them?
- Does the deployed application code still work after the migration but before the code deploy? (For local dev this is less critical but the habit matters.)
- If destructive, is there a safer two-step path: add new → backfill → cut over → drop old?

## 3. Migration review

- Generate the migration with `pnpm prisma migrate dev --name <descriptive_snake_case>`.
- Read the generated SQL. Prisma sometimes produces `DROP` where a rename was intended — do not accept a drop unless you meant one.
- Rename inside a single migration using Prisma's `@@map` / `@map` where possible instead of drop-then-add.

## 4. Constraints and indexes

- Unique invariants that must always hold → database `@unique` or `@@unique`.
- Foreign keys use explicit `onDelete` (`Cascade` for owned-by-user rows like `CollectionItem` and `WearLog`; `Restrict` for canonical references like `Fragrance` → `Brand`).
- Add an index for every query pattern that will run on a large table. Justify each index with the query that uses it.
- Money as `Int` (minor units) + separate `currency String` column. Never `Float`.

## 5. Generated client

- Run `pnpm prisma generate` after schema edits.
- If types break in consuming code, fix the consumers in the same slice — do not leave the tree red.

## 6. Seed impact

- If the change affects seed data, update `prisma/seed.ts`.
- Seed must be idempotent (`upsert`, not `create`) so re-running does not duplicate rows.
- Never assume the seed runs against an empty database.

## 7. Tests

- If the change affects a query surface (list/filter/aggregate), add or update a test that runs against a test database (or a fixture, for pure functions).
- Analytics aggregations must have fixtures that pin the expected numeric output.

## 8. Safety rails

- Never run `prisma migrate reset` in this workflow. If you think you need to, stop and ask the user.
- Never run `prisma db push --force-reset`.
- Never `TRUNCATE`, `DROP DATABASE`, or `DROP SCHEMA` non-interactively.
- The pre-tool-safety hook will block these; do not try to route around it.

## 9. Report

Summarise: schema diff, migration filename, indexes added and why, seed changes, tests added, and any follow-up cleanup (e.g. a planned drop-old-column migration once code has cut over).

---
name: build-feature
description: Repeatable workflow for implementing a vertical slice in Frag Avenue. Invoke at the start of any feature work. Enforces smallest-complete-slice discipline and blocks unrelated refactoring.
---

# Build-feature workflow

Follow these steps in order. Do not skip. Do not refactor code outside the slice.

## 1. Inspect

- Read `CLAUDE.md` and any doc under `docs/` relevant to the slice.
- Read the existing files you are about to touch. Skim the module's `index.ts` and `data.ts` to see what already exists.
- Run `git status` — surface any uncommitted work so it is not overwritten.

## 2. Identify boundaries

State — in one or two sentences — which module(s) this slice touches and which it must NOT touch. If the slice crosses more than two modules, stop and reconsider whether it is really one slice.

## 3. Acceptance criteria

Write 3–6 bullet acceptance criteria before writing code. Include at minimum:

- The user-visible behaviour.
- The authorization rule (which user can see/do what).
- The validation rule (what inputs are accepted/rejected).
- The empty and error states.

## 4. Implement the smallest complete slice

- Data access in `src/modules/<name>/data.ts` (Prisma calls).
- Domain / application logic in `src/modules/<name>/service.ts` (pure where possible).
- Public API surface in `src/modules/<name>/index.ts` (only what other modules need).
- UI in `src/app/...` — Server Components by default; `"use client"` only when needed.
- Server actions live next to the page or in `actions.ts`; every action validates input with Zod and derives the user id from the session.

## 5. Validate

- Zod schema for every server action / route handler.
- Zod schema for every external API response (weather, etc.).
- Never trust a client-supplied user id.

## 6. Tests

- Pure logic: unit tests with representative fixtures.
- Server actions: happy path + authorization boundary test.
- Update or extend existing tests only where the slice actually changes their behaviour.

## 7. Checks

Run only what is relevant to the touched files:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (or a filtered run)
  If the slice includes routing/UI changes, verify in the browser (dev server) — do not claim success from types alone.

## 8. Review the diff

Read the full diff. Look for:

- Business logic that leaked into a page component.
- Prisma calls in the wrong layer.
- Missing empty/error UI states.
- Console logs, TODOs, or commented-out code.
- Files touched that are not part of the slice — revert them.

## 9. Report

Summarise: files changed, tests added, checks run, what the user should verify manually, and any known risks or follow-ups that are explicitly out of this slice.

## Anti-patterns to reject in yourself

- "While I'm here, let me also…" → No. New slice, new pass.
- Adding a helper "for reuse later" with no second caller → No. Inline it.
- Renaming things that already work → No.
- Adding a dependency without checking Next 15 / React 19 compatibility → No.

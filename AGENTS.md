# Agent Instructions

## Git Policy
- **NEVER create branches, PRs, or push to remote** - The user will handle all git operations
- Only commit locally if explicitly requested by the user
- Focus on implementing features and fixes, not git workflow

## Commands
```bash
pnpm dev              # Dev server (localhost:3000)
pnpm build            # Production build
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm vitest run test/unit/tax.test.ts  # Single test file
pnpm nuxt typecheck   # TypeScript checking
```

## Infrastructure
- **Database**: 
  - **Dev**: Local SQLite (stored in `.data/db/sqlite.db`). Access via `sqlite3` or Drizzle.
  - **Prod**: Cloudflare D1. Access via `npx nuxthub database query`.
- **Storage**: Cloudflare R2 for images/PDFs.

## Code Style
- **Stack**: Nuxt 4, Vue 3, Pinia, Nuxt UI v4, Tailwind CSS 4, TypeScript strict
- **Nuxt UI v4 Gotchas**: 
  - `UDropdown` is now `UDropdownMenu`.
  - `UDropdownMenu` items are a flat array `[{ label: '...', click: ... }]` (not nested arrays).
  - Colors: Use `neutral`, `success`, `error`, `info`, `warning` (v3 colors like `gray`, `red`, `blue` are deprecated).
- **Structure**: Frontend in `~/app` (composables, components, pages), `types/index.ts` for interfaces
- **Naming**: PascalCase components, camelCase composables (`useFoo`), UPPER_CASE constants
- **Types**: Strong typing with `defineProps<T>()`, never `any`, percentages as 0-1 internally
- **Imports**: Use `~/` alias, explicit imports from composables (not auto-imported)
- **Formatting**: Currency as `$123k`/`$45M`, percentages as `45%` in UI
- **Errors**: `Math.max(0, val)` for negatives, `isFinite()` for division guards
- **Patterns**: Iterative solvers for circular deps (e.g., house price ↔ stamp duty)

## Edge Compatibility
- **Crypto**: Use Web Crypto API (`crypto.subtle`) instead of `node:crypto` (not supported in Cloudflare Workers).
- **Timeouts**: Avoid long-running processes; Cloudflare Workers have strict wall-clock limits (disable AI "thinking" modes).

## Domain Context
See `docs/DOMAIN.md` for business rules, glossary, calculation logic, and gotchas.

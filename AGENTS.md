# Agent Instructions

## Quick Start
```bash
pnpm install                    # Install dependencies
cp .env.example .env            # Copy environment template
# Fill in: NUXT_SESSION_PASSWORD, NUXT_GEMINI_API_KEY, NUXT_OAUTH_GOOGLE_*
pnpm dev                        # Start dev server at localhost:3000
```

## Commands
```bash
# Development
pnpm dev                        # Dev server (localhost:3000)
pnpm build                      # Production build
pnpm nuxt typecheck             # TypeScript checking (no separate linter)

# Testing
pnpm test                       # Watch mode
pnpm test:run                   # Run once
pnpm vitest run test/unit/tax.test.ts      # Single file
pnpm vitest run --grep "HECS"              # By pattern

# Database
pnpm db:generate                # Generate migration from schema changes
pnpm db:migrate                 # Apply migrations locally
pnpm db:migrate:prod            # Apply migrations to production D1
pnpm db:pull:prod               # Pull production D1 database locally
pnpm db:push:prod               # Push local database to production

# Blob Storage
pnpm blob:pull:prod             # Pull R2 blobs locally
pnpm blob:push:prod             # Push local blobs to R2
```

## Infrastructure
- **Database**: 
  - **Dev**: Local SQLite (`.data/db/sqlite.db`). Access via `sqlite3` or Drizzle.
  - **Prod**: Cloudflare D1. Access via `npx nuxthub database query`.
- **Storage**: Cloudflare R2 for images/PDFs (`hub:blob`).
- **Auth**: Google OAuth via `nuxt-auth-utils`.
- **AI**: Google Gemini for receipt processing.

## Architecture

### Data Layer Philosophy
This app uses **two patterns** for data management:

| Data Type | Pattern | Why |
|-----------|---------|-----|
| **Documents** (Session/Config) | Pinia store + `watchDebounced` + `$fetch` | Complex nested object edited constantly. Simple ref is more reliable. |
| **Collections** (Expenses, Inbox, Categories) | TanStack Query + mutations | Entity lists benefit from caching, optimistic updates, deduplication. |

**Key principle**: Same mental model (load → display → mutate → sync), different implementations based on data shape.

### Real-time Sync
- **SSE** (`/api/events`) broadcasts changes to all connected devices
- Session changes → `store.load()` refetch
- Collection changes → `queryClient.invalidateQueries()`

### Directory Structure
- `app/components/` - Vue components (PascalCase)
- `app/composables/` - Shared logic (`useFoo.ts`), includes `queries/` for TanStack Query
- `app/pages/` - File-based routing
- `app/types/` - TypeScript interfaces
- `server/api/` - API routes
- `server/db/` - Drizzle schema & migrations
- `server/utils/` - Server utilities (gemini, broadcast)

## Code Style

### Stack
Nuxt 4, Vue 3, Pinia, TanStack Query, Nuxt UI v4, Tailwind CSS 4, TypeScript strict

### Nuxt UI v4 Gotchas
- `UDropdown` → `UDropdownMenu`
- Items are flat arrays: `[{ label: '...', click: ... }]` (not nested)
- Colors: `neutral`, `success`, `error`, `info`, `warning` (NOT `gray`, `red`, `blue`)
- Icons: `i-heroicons-{name}` (e.g., `i-heroicons-cloud`, `i-heroicons-arrow-path`)

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ExpenseEditor.vue` |
| Composables | camelCase with `use` prefix | `useSessionStore.ts` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_CONFIG` |
| Types/Interfaces | PascalCase | `SessionConfig` |
| API routes | kebab-case | `[id].delete.ts` |

### TypeScript
- Strong typing with `defineProps<T>()`, never `any` (use `unknown` + type guards)
- Percentages stored as decimals internally (0.05 = 5%), displayed as `5%`
- Currency displayed as `$123k` / `$45M` via `formatCurrency()`

### Vue Component Patterns
```vue
<script setup lang="ts">
const props = defineProps<{ expense: Expense; isLoading?: boolean }>()
const emit = defineEmits<{
  (e: 'update', updates: Partial<Expense>): void
  (e: 'delete'): void
}>()
</script>
```

### Imports
- Use `~/` alias for app imports: `import { formatCurrency } from '~/composables/useFormatter'`
- Explicit imports from `~/composables/queries` (barrel exports)
- Server imports: `~~/server/db/schema`, `hub:db`, `hub:blob`

### Error Handling
```typescript
// Client: defensive math
const rate = Math.max(0, val)
if (!isFinite(result)) return 0

// Server: createError pattern
try {
  const result = await db.select().from(expenses)
  return result
} catch (err: unknown) {
  console.error('Fetch error:', err)
  throw createError({ statusCode: 500, statusMessage: 'Failed to fetch' })
}
```

### Patterns
- Iterative solvers for circular dependencies (e.g., house price ↔ stamp duty)
- Optimistic UI: Update local state immediately, rollback on error
- Debounced auto-save: 2 seconds for session config

## Edge Compatibility (Cloudflare Workers)
- **Crypto**: Use `crypto.subtle` (Web Crypto API), NOT `node:crypto`
- **Timeouts**: Avoid long-running processes; Workers have strict wall-clock limits

## Testing
Tests are in `test/unit/`. Focus areas: tax calculations, HECS thresholds, loan math.

## Domain Context
See `docs/DOMAIN.md` for:
- Business rules (TMN, MFB, DTI calculations)
- Australian lending context
- Tax rates and HECS thresholds
- Common calculation bugs to avoid

## Quick Reference

### Session Store (Document Pattern)
```typescript
const store = useSessionStore()
await store.load()                    // Fetch from server
store.config.loan.interestRate = 0.05 // Direct mutation (auto-saves)
```

### TanStack Query (Collection Pattern)
```typescript
const { data: expenses } = useExpensesQuery()
const { mutate } = useExpenseMutation()
mutate({ merchant: 'Coles', total: 45.50 })  // Optimistic update
```

### SSE Broadcast (Server)
```typescript
import { broadcastExpensesChanged } from '~~/server/utils/broadcast'
broadcastExpensesChanged(user.email)  // Notify other devices
```
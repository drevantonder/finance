# Agent Instructions

## <injected-shell-output>
When you see `<injected-shell-output>`. The command has been executed and the result has been injected into your prompt/response. (The results are accurate to the time of the prompt.)

<injected-shell-output>
```bash
echo "Hello, world!"
```
<result>
Hello, world!
</result>
</injected-shell-output>

## Quick Start
```bash
pnpm install                    # Install dependencies
cp .env.example .env            # Set: NUXT_SESSION_PASSWORD, NUXT_GEMINI_API_KEY, NUXT_OAUTH_GOOGLE_*
pnpm dev                        # Dev server at localhost:3000
```

## Commands
```bash
# Development
pnpm dev                        # Dev server
pnpm build                      # Production build
pnpm nuxt typecheck             # TypeScript check (no ESLint/Prettier)

# Testing (Vitest)
pnpm test                       # Watch mode
pnpm test:run                   # Run once
pnpm vitest run test/unit/tax.test.ts      # Single file
pnpm vitest run --grep "HECS"              # By pattern

# Database
pnpm db:generate                # Generate migration from schema changes
pnpm db:migrate                 # Apply migrations locally
pnpm db:migrate:prod            # Apply migrations to production D1
pnpm db:pull:prod               # Pull production D1 locally
pnpm db:push:prod               # Push local to production

# Blob Storage
pnpm blob:pull:prod             # Pull R2 blobs locally
pnpm blob:push:prod             # Push local blobs to R2
```

## Infrastructure
- **Database**: Dev=SQLite (`.data/db/sqlite.db`), Prod=Cloudflare D1
- **Storage**: Cloudflare R2 (`hub:blob`)
- **Auth**: GitHub OAuth via `nuxt-auth-utils`
- **AI**: Google Gemini for receipt OCR

### CI/CD
- **GitHub Actions**: Automated testing on push/PR
- **Workflows**:
  - `.github/workflows/test.yml` - Typecheck, unit tests, e2e tests, coverage
  - `.github/workflows/lighthouse.yml` - Performance metrics (PRs only)
- **Branch Protection**: Enforced via GitHub Rulesets ("Production Standards").
  - 🛑 **Direct pushes to `main` are BLOCKED.**
  - All changes MUST go through a Pull Request.
  - Required checks: `Type check`, `Unit tests`, `E2E tests`, `Cloudflare Pages`.
  - PRs must be up-to-date with `main`.

## Architecture

### Data Layer (Two Patterns)
| Data Type | Pattern | Why |
|-----------|---------|-----|
| **Documents** (Session/Config) | Pinia + `watchDebounced` + `$fetch` | Complex nested object, constant edits |
| **Collections** (Expenses, Categories) | TanStack Query + mutations | Entity lists benefit from caching, optimistic updates |

### Real-time Sync
- SSE (`/api/events`) broadcasts changes to all devices
- Session changes → `store.load()` refetch
- Collection changes → `queryClient.invalidateQueries()`

### Directory Structure
```
app/components/     # Vue components (PascalCase)
app/composables/    # Shared logic (useFoo.ts), queries/ for TanStack
app/pages/          # File-based routing
app/types/          # TypeScript interfaces
server/api/         # API routes ([id].delete.ts)
server/db/          # Drizzle schema & migrations
server/utils/       # Server utilities (gemini, broadcast)
test/unit/          # Vitest tests
```

## Code Style

### Stack
Nuxt 4, Vue 3, Pinia, TanStack Query, Nuxt UI v4, Tailwind CSS 4, TypeScript strict

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ExpenseEditor.vue` |
| Composables | camelCase + `use` | `useSessionStore.ts` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_CONFIG` |
| Types | PascalCase | `SessionConfig` |
| API routes | kebab-case | `[id].delete.ts` |

### Imports
```typescript
// App imports - use ~/
import { formatCurrency } from '~/composables/useFormatter'
import type { Expense } from '~/types'

// Server imports - use ~~/
import { expenses } from '~~/server/db/schema'
import { db } from 'hub:db'
import { blob } from 'hub:blob'
```

### TypeScript
- Strong typing with `defineProps<T>()`, never `any` (use `unknown` + guards)
- Percentages stored as decimals (0.05 = 5%), displayed as `5%`
- Currency displayed via `formatCurrency()` → `$123k` / `$45M`

### Vue Components
```vue
<script setup lang="ts">
const props = defineProps<{ expense: Expense; isLoading?: boolean }>()
const emit = defineEmits<{
  (e: 'update', updates: Partial<Expense>): void
  (e: 'delete'): void
}>()
</script>
```

### Server API Handlers
```typescript
export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  
  try {
    const result = await db.select().from(expenses).where(eq(expenses.id, id))
    return result
  } catch (err: unknown) {
    console.error('Fetch error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch' })
  }
})

// Background work (Cloudflare Workers)
event.waitUntil(asyncOperation())
```

### TanStack Query (Collections)
```typescript
// Query
const { data: expenses } = useExpensesQuery()

// Mutation with optimistic update
const { mutate } = useExpenseMutation()
mutate({ merchant: 'Coles', total: 45.50 })
```

### Pinia Store (Documents)
```typescript
const store = useSessionStore()
await store.load()                    // Fetch from server
store.config.loan.interestRate = 0.05 // Direct mutation (auto-saves via watchDebounced)
```

### Error Handling
```typescript
// Client: defensive math
const rate = Math.max(0, val)
if (!isFinite(result)) return 0

// Server: createError pattern
throw createError({ statusCode: 404, statusMessage: 'Not found' })
```

### Testing (Vitest)
```typescript
import { describe, it, expect } from 'vitest'
import { calculateIncomeTax } from '~/composables/useTaxCalculator'

describe('calculateIncomeTax', () => {
  it('returns $0 for income below threshold', () => {
    expect(calculateIncomeTax(18200)).toBe(0)
  })

  it('calculates bracket correctly', () => {
    expect(calculateIncomeTax(45000)).toBeCloseTo(5188, 0)
  })
})
```

## Nuxt UI v4 Gotchas
- `UDropdown` → `UDropdownMenu`
- Items are flat: `[{ label: '...', click: () => {} }]` (not nested)
- Colors: `neutral`, `success`, `error`, `info`, `warning` (NOT gray/red/blue)
- Icons: `i-heroicons-{name}` (e.g., `i-heroicons-cloud`)

## Edge Compatibility (Cloudflare Workers)
- Use `crypto.subtle` (Web Crypto), NOT `node:crypto`
- Avoid long-running processes; Workers have strict time limits
- Use `event.waitUntil()` for background tasks

## Domain Context
See **docs/DOMAIN.md** for:
- Business rules (TMN, MFB, DTI calculations)
- Australian tax rates and HECS thresholds
- Common calculation bugs to avoid

## Documentation Lookup
Use **Context7** tools for up-to-date library documentation:

1. `context7_resolve-library-id` → find library ID from package name (e.g., "nuxt", "drizzle-orm")
2. `context7_query-docs` → query specific topics with the library ID

**Prioritize Context7** over guessing API usage for:
- Nuxt features, Vue composables
- Drizzle ORM patterns
- TanStack Query mutations
- Nuxt UI v4 components
- Tailwind CSS utilities

## Ralph Workflow
This project uses an autonomous batch execution model. See **@docs/ralph-workflow.md** for the complete protocol.

**Key Rules**:
- Tax/HECS functions expect ANNUAL income (multiply monthly × 12)
- Percentages stored as decimals (0.05), displayed as %
- Iterative solvers for circular deps (house price ↔ stamp duty)

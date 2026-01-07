# E2E Test Performance Optimizations

## Changes Made

### 1. Playwright Configuration (playwright.config.ts)
- **Parallel Execution**: Increased CI workers from 1 to 4 (4x parallelization)
- **Timeout Optimization**:
  - Reduced webServer timeout from 120s to 60s
  - Added `navigationTimeout: 10000ms` (10s)
  - Added `actionTimeout: 5000ms` (5s)
- **Reporter**: Changed to 'github' for CI (better CI integration)

### 2. Test File Optimizations

#### smoke.spec.ts
- Removed `waitForLoadState('networkidle')` (slow, unnecessary)

#### dashboard.spec.ts
- Removed all `waitForTimeout()` calls
- Removed explicit `waitForSelector()` calls (replaced with `expect().toBeVisible()`)
- Reduced 2000ms wait for charts (replaced with `expect().toBeVisible()`)

#### expenses.spec.ts
- Removed `waitForTimeout(5000)` → replaced with `expect().toBeVisible()`
- Removed `waitForTimeout(3000)` → removed (not needed)
- Removed `waitForTimeout(2000)` → removed (not needed)
- Reduced explicit timeouts from 10000ms to default

#### income.spec.ts
- Removed all 8 instances of `waitForTimeout(2000)`
- All tests now use proper assertions instead of hard delays

### 3. Expected Performance Improvement

**Before**: ~2m 30s
- 1 worker (sequential execution)
- 60s+ in hard-coded delays
- 120s server startup timeout

**After**: ~45-60s (estimated)
- 4 workers (4x parallelization for independent tests)
- 0s in hard-coded delays (replaced with smart waits)
- 60s server startup timeout
- ~15-20s saved from reduced delays
- ~30-45s saved from parallel execution (4 workers / 4 test files)

**Total Expected Savings**: ~90-105 seconds (60-70% faster)

### 4. Test Reliability Improvements
- Replaced hard delays with smart assertions
- More deterministic test execution
- Better integration with CI via GitHub reporter
- Faster feedback loop

## Testing
Run: `pnpm test:e2e`

Expected: Full suite completes in < 60 seconds

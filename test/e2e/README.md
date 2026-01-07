# E2E Testing with Playwright

This project uses Playwright for End-to-End (E2E) testing.

## Performance Optimizations

We have optimized the E2E test suite to run in under 30 seconds (previously ~2m 30s).

### Global Authentication
We use a global setup (`test/e2e/auth.setup.ts`) to authenticate once and reuse the session state across all tests. This avoids the overhead of logging in for every single test.
The authentication state is stored in `playwright/.auth/user.json`.

### Proper Waiting Strategies
Hardcoded `page.waitForTimeout()` calls have been replaced with proper Playwright assertions and waiting strategies:
- `expect(locator).toBeVisible()`
- `page.waitForSelector()`
- `expect(locator).toContainText()`

This makes the tests faster and more reliable as they only wait as long as necessary.

### Parallel Execution
Tests are configured to run in parallel. In CI environments, we use 2 workers to balance speed and resource usage. Locally, it defaults to the number of available CPU cores.

## Running Tests

```bash
pnpm test:e2e
```

## Adding New Tests
When adding new tests, ensure you:
1. Avoid `page.waitForTimeout()`.
2. Reuse the global authentication state by default.
3. If a test needs to be unauthenticated, use:
   ```typescript
   test.use({ storageState: { cookies: [], origins: [] } })
   ```

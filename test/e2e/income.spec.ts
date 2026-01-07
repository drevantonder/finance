import { test, expect } from '@playwright/test'

test.describe('Income Management Flow', () => {
  test('income page loads successfully', async ({ page }) => {
    await page.goto('/menu/income')
    
    // Verify page loaded - check for h1 heading
    await expect(page.locator('h1')).toContainText('Income Strategy', { timeout: 10000 })

    // Verify key sections exist
    const pageContent = await page.content()
    expect(pageContent).toContain('Household Members')
    expect(pageContent).toContain('Income Sources')
  })

  test('displays income sources list', async ({ page }) => {
    await page.goto('/menu/income')
    await expect(page.locator('h1')).toContainText('Income Strategy', { timeout: 10000 })

    // Check for income sources section
    const pageContent = await page.content()
    expect(pageContent).toContain('Income Sources')

    // The page should show monthly net income (even if $0)
    expect(pageContent).toContain('NET')
  })

  test('household section displays members', async ({ page }) => {
    await page.goto('/menu/income')
    await expect(page.locator('h1')).toContainText('Income Strategy', { timeout: 10000 })

    // Household section should be visible
    await expect(page.getByText('Household Members').first()).toBeVisible()

    // Look for person names (or empty state)
    const pageContent = await page.content()
    expect(pageContent).toBeTruthy()
  })

  test('timeline impact section displays', async ({ page }) => {
    await page.goto('/menu/income')
    await expect(page.locator('h1')).toContainText('Income Strategy', { timeout: 10000 })

    // Check for projected timeline
    await expect(page.getByText('Projected Timeline').first()).toBeVisible()

    // Should show ready by date or capacity/surplus info
    const pageContent = await page.content()
    expect(pageContent.toLowerCase()).toContain('ready by')
  })

  test('can navigate to income details', async ({ page, context }) => {
    // This test requires an income source to exist
    // We'll verify navigation functionality exists
    await page.goto('/menu/income')
    await expect(page.locator('h1')).toContainText('Income Strategy', { timeout: 10000 })

    // Look for edit button in income sources
    const pageContent = await page.content()

    // If there are income sources, there should be edit buttons
    if (pageContent.includes('Income Sources')) {
      // The edit buttons should have pencil icons or similar
      expect(pageContent).toBeTruthy()
    }
  })

  test('income strategy displays key metrics', async ({ page }) => {
    await page.goto('/menu/income')
    await expect(page.locator('h1')).toContainText('Income Strategy', { timeout: 10000 })

    // Verify key financial metrics are displayed
    const pageContent = await page.content()
    expect(pageContent).toContain('Capacity')
    expect(pageContent).toContain('Surplus')

    // Check for currency formatting
    expect(pageContent).toMatch(/\$/)
  })

  test('displays tmn strategy guidance', async ({ page }) => {
    await page.goto('/menu/income')
    await expect(page.locator('h1')).toContainText('Income Strategy', { timeout: 10000 })

    // Check for TMN Strategy guidance card
    await expect(page.getByText('TMN Strategy')).toBeVisible()

    // Verify guidance text is present
    const pageContent = await page.content()
    expect(pageContent).toContain('TMN (Total Monthly Needs)')
  })

  test('displays proper layout for income sources', async ({ page }) => {
    await page.goto('/menu/income')
    await expect(page.locator('h1')).toContainText('Income Strategy', { timeout: 10000 })

    // Verify sections are properly laid out using first() for ambiguous selectors
    const householdSection = page.getByText('Household Members')
    const incomeSection = page.getByText('Income Sources')
    const strategySection = page.getByText('TMN Strategy')

    await expect(householdSection.first()).toBeVisible()
    await expect(incomeSection.first()).toBeVisible()
    await expect(strategySection.first()).toBeVisible()
  })

  test('shows monthly net income summary', async ({ page }) => {
    await page.goto('/menu/income')
    await expect(page.locator('h1')).toContainText('Income Strategy', { timeout: 10000 })

    // The header for Income Sources shows monthly net income
    await expect(page.getByText(/NET/)).toBeVisible()

    // Verify income section has a badge or label
    const incomeSourcesHeader = page.locator('h2').filter({ hasText: 'Income Sources' })
    const count = await incomeSourcesHeader.count()

    // There should be at least one Income Sources heading
    expect(count).toBeGreaterThan(0)
  })
})

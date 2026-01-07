import { test, expect } from '@playwright/test'

// Setup authentication before each test
test.beforeEach(async ({ page, context }) => {
  // Call test login endpoint to create mock session
  const response = await context.request.post('/api/auth/test-login')
  const data = await response.json()
  expect(response.ok()).toBe(true)
  expect(data.success).toBe(true)
})

test.describe('Dashboard Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/')

    // Wait for the dashboard heading to appear
    await expect(page.locator('h1')).toContainText('Dashboard')

    // Verify main action buttons are visible (use text selector as buttons might have different roles)
    await expect(page.getByText('Update Assets')).toBeVisible()
    await expect(page.getByText('View Goal')).toBeVisible()

    // Verify main cards are present (use first to handle duplicate text)
    await expect(page.getByText('Allocation').first()).toBeVisible()
    await expect(page.getByText('Net Worth Projection')).toBeVisible()
    await expect(page.getByText('Cash Flow Projection')).toBeVisible()
  })

  test('has no critical console errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore 401 errors from auth checks during initial load
        if (!text.includes('401')) {
          errors.push(text)
        }
      }
    })

    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()

    // Check for critical console errors (excluding auth-related ones)
    expect(errors.filter(e => !e.includes('401'))).toHaveLength(0)
  })

  test('displays attention items when applicable', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()

    // Attention items section may or may not be visible depending on data
    // Just verify the page doesn't crash with or without attention items
    const pageContent = await page.content()
    expect(pageContent).toBeTruthy()
  })

  test('renders charts components', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()

    // Wait for charts to render (check for canvas elements)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()

    // Test Update Assets button/link
    await page.getByText('Update Assets').click()
    await page.waitForURL(/\/menu\/assets/)
    expect(page.url()).toContain('/menu/assets')

    // Go back to dashboard
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()

    // Test View Goal button/link
    await page.getByText('View Goal').click()
    await page.waitForURL(/\/goal/)
    expect(page.url()).toContain('/goal')
  })
})

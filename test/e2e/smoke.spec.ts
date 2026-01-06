import { test, expect } from '@playwright/test'

test('login page loads successfully', async ({ page }) => {
  await page.goto('/login')

  // Wait for page to load completely
  await page.waitForLoadState('networkidle')

  // Verify app title is visible
  await expect(page.locator('h1')).toContainText('Finance')

  // Verify sign-in button is visible
  await expect(page.getByText('Sign in with Google')).toBeVisible()
})

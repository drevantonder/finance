import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ request }) => {
  // Call test login endpoint to create mock session
  const response = await request.post('/api/auth/test-login')
  const data = await response.json()
  expect(response.ok()).toBe(true)
  expect(data.success).toBe(true)

  await request.storageState({ path: authFile })
})

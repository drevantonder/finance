/**
 * Test-only endpoint: Creates a mock authenticated session
 * This is only available in development/test mode
 */
export default defineEventHandler(async (event) => {
  // Simple security check: this endpoint should only be used for testing
  // In production, this would be blocked by firewall/API gateway rules

  // Create mock user session
  await setUserSession(event, {
    user: {
      email: 'test@example.com',
      name: 'Test User'
    },
    testMode: true,
    loggedInAt: Date.now()
  }, {
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })

  return { success: true, message: 'Test session created' }
})

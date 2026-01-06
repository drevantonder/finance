export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event)

  // Only protect /api/ routes
  if (!pathname.startsWith('/api/')) {
    return
  }

  // Exclude internal auth routes and test login endpoint
  const publicRoutes = ['/api/_auth/', '/api/auth/test-login']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return
  }

  // Use requireUserSession - throws 401 if no session
  await requireUserSession(event)
})

export default defineNuxtRouteMiddleware(async (to) => {
  // Public routes - no auth check needed
  const publicPaths = ['/login', '/auth/', '/api/auth/test-login']
  if (publicPaths.some(path => to.path === path || to.path.startsWith(path))) {
    return
  }

  const { loggedIn, fetch } = useUserSession()

  // Ensure session is fetched on SSR
  if (import.meta.server) {
    await fetch()
  }

  // If not logged in, redirect to login
  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})

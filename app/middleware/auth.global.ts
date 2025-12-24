export default defineNuxtRouteMiddleware(async (to) => {
  // Public routes - no auth check needed
  if (to.path === '/login' || to.path.startsWith('/auth/')) {
    return
  }

  const { loggedIn, fetch } = useUserSession()
  
  // Ensure session is fetched on SSR
  if (import.meta.server) {
    await fetch()
  }

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})

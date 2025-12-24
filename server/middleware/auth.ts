export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event)
  
  // Only protect /api/ routes (excluding internal auth)
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/_auth/')) {
    return
  }

  // Use requireUserSession - throws 401 if no session
  await requireUserSession(event)
})

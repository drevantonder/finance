export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const authSecret = config.authSecret

  // Protect all /api routes
  if (!event.path.startsWith('/api/')) return

  // Prevent caching of sensitive API responses
  setResponseHeader(event, 'Cache-Control', 'no-store, max-age=0')

  const token = getHeader(event, 'x-auth-token')

  if (!authSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: Auth secret not set',
    })
  }

  if (token !== authSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }
})

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const authSecret = config.authSecret

  // Only protect /api/session routes
  if (!event.path.startsWith('/api/session')) return

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

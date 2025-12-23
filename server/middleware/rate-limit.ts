interface RateLimitStore {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitStore>()

// Simple in-memory rate limiter
export default defineEventHandler((event) => {
  // Only limit expensive POST/PUT/DELETE routes
  if (event.method === 'GET' || !event.path.startsWith('/api/')) return

  const ip = getHeader(event, 'x-forwarded-for') || 'unknown'
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 15 // General limit for mutations

  // Stricter limit for AI processing
  const isAiProcess = event.path.includes('/process') || (event.path === '/api/expenses' && event.method === 'POST')
  const limit = isAiProcess ? 5 : maxRequests

  const record = store.get(ip) || { count: 0, resetAt: now + windowMs }

  if (now > record.resetAt) {
    record.count = 1
    record.resetAt = now + windowMs
  } else {
    record.count++
  }

  store.set(ip, record)

  if (record.count > limit) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests. Please slow down.',
    })
  }
})

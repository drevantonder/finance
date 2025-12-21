import { db } from 'hub:db'
import { sessions } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { setNoStore } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  setNoStore(event)
  
  try {
    const result = await db.select()
      .from(sessions)
      .where(eq(sessions.id, 'default'))
      .limit(1)

    if (!result || result.length === 0) {
      return { config: null, updatedAt: Date.now() }
    }

    const session = result[0]
    if (!session) {
      return { config: null, updatedAt: Date.now() }
    }

    const config = JSON.parse(session.config)
    
    return {
      config,
      updatedAt: session.updatedAt.getTime()
    }
  } catch (err: unknown) {
    console.error('Fetch session error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch session' })
  }
})

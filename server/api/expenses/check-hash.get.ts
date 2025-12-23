import { db } from 'hub:db'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const hash = query.hash as string

  if (!hash) {
    throw createError({ statusCode: 400, statusMessage: 'Hash is required' })
  }

  const result = await db.select({ id: expenses.id })
    .from(expenses)
    .where(eq(expenses.imageHash, hash))
    .limit(1)

  return {
    exists: result.length > 0
  }
})

import { db } from 'hub:db'
import { expenses } from '~~/server/db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const result = await db.select()
      .from(expenses)
      .orderBy(desc(expenses.capturedAt))

    return result
  } catch (err: unknown) {
    console.error('Fetch expenses error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch expenses' })
  }
})


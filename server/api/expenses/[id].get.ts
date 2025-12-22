import { db } from 'hub:db'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  try {
    const result = await db.select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1)

    if (!result || result.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
    }

    return result[0]
  } catch (err: unknown) {
    console.error('Fetch expense error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch expense' })
  }
})


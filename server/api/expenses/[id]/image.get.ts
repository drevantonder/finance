import { blob } from 'hub:blob'
import { db } from 'hub:db'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  // Get the actual key from the DB to support both .jpg and .pdf
  const result = await db.select({
    imageKey: expenses.imageKey
  })
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1)

  if (!result || result.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
  }

  return blob.serve(event, result[0]?.imageKey || '')
})


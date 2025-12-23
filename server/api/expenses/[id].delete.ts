import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  try {
    // 1. Get the image key first
    const result = await db.select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1)

    if (result && result.length > 0) {
      const imageKey = result[0].imageKey
      // 2. Delete from R2
      await blob.delete(imageKey)
    }

    // 3. Delete from DB
    await db.delete(expenses)
      .where(eq(expenses.id, id))

    return { success: true }
  } catch (err: unknown) {
    console.error('Delete expense error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete expense' })
  }
})


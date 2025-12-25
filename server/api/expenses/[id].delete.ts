import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses, inboxItems } from '~~/server/db/schema'
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

    if (result && result.length > 0 && result[0].imageKey) {
      const imageKey = result[0].imageKey
      // 2. Delete from R2
      await blob.delete(imageKey)
    }

    // 2.5 Clear references in inbox items
    await db.update(inboxItems)
      .set({ expenseId: null })
      .where(eq(inboxItems.expenseId, id))

    // 3. Delete from DB
    await db.delete(expenses)
      .where(eq(expenses.id, id))

    // Notify other devices
    const { user } = await requireUserSession(event)
    if (user?.email) {
      await broadcastExpensesChanged(user.email)
    }

    return { success: true }
  } catch (err: unknown) {
    console.error('Delete expense error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete expense' })
  }
})


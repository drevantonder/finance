import { db } from 'hub:db'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  const body = await readBody(event)
  const now = new Date()

  try {
    const updateData: any = {
      updatedAt: now,
    }

    // List of allowed fields to update
    const allowedFields = ['status', 'total', 'tax', 'merchant', 'date', 'items']
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    await db.update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))

    // Notify other devices
    const session = await requireUserSession(event)
    const email = (session.user as any).email
    if (email) {
      await broadcastExpensesChanged(email)
    }

    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1)
    return result[0]
  } catch (err: unknown) {
    console.error('Update expense error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to update expense' })
  }
})


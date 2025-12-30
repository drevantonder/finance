import { db } from 'hub:db'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { broadcastExpensesChanged } from '~~/server/utils/broadcast'
import { generateReceiptHash } from '~~/server/utils/hash'

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

    // Recalculate receiptHash if relevant fields changed
    const hashFields = ['merchant', 'date', 'total']
    if (hashFields.some(f => body[f] !== undefined)) {
      const current = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1).get()
      if (current) {
        const merchant = String(body.merchant ?? current.merchant ?? 'unknown')
        const date = String(body.date ?? current.date ?? '')
        const total = Number(body.total ?? current.total ?? 0)
        const receiptString = `${merchant.toLowerCase().trim()}_${date}_${total.toFixed(2)}`
        const receiptHash = await generateReceiptHash(receiptString)
        
        await db.update(expenses)
          .set({ receiptHash })
          .where(eq(expenses.id, id))
      }
    }

    // Notify other devices
    const session = await requireUserSession(event)
    const email = (session.user as any).email
    if (email) {
      broadcastExpensesChanged(email)
    }

    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1)
    return result[0]
  } catch (err: unknown) {
    console.error('Update expense error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to update expense' })
  }
})


import { db } from 'hub:db'
import { inArray, eq } from 'drizzle-orm'
import { expenseClaims } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { expenseIds, action, claimId } = body

  if (!expenseIds?.length) return { success: false }

  // For archive/claim actions, we need to ensure expense_claim records exist
  // Get existing expense_claim records for these expenses
  const existingClaims = await db.select()
    .from(expenseClaims)
    .where(inArray(expenseClaims.expenseId, expenseIds))
    .all()

  const existingExpenseIds = new Set(existingClaims.map(c => c.expenseId))
  const missingExpenseIds = expenseIds.filter((id: string) => !existingExpenseIds.has(id))

  // Create missing expense_claim records
  if (missingExpenseIds.length > 0) {
    const newClaims = missingExpenseIds.map((expenseId: string) => ({
      id: crypto.randomUUID(),
      expenseId,
      status: action === 'archive' ? 'archived' : action === 'claim' ? 'claimed' : 'pending',
      createdAt: new Date(),
      claimedAt: action === 'claim' ? new Date() : undefined,
      claimId: action === 'claim' ? claimId : undefined
    }))

    await db.insert(expenseClaims).values(newClaims)
  }

  // Update existing records
  if (existingClaims.length > 0) {
    const existingIds = existingClaims.map(c => c.id)

    if (action === 'archive') {
      await db.update(expenseClaims)
        .set({ status: 'archived' })
        .where(inArray(expenseClaims.id, existingIds))
    } else if (action === 'unarchive') {
      await db.update(expenseClaims)
        .set({ status: 'pending' })
        .where(inArray(expenseClaims.id, existingIds))
    } else if (action === 'claim') {
      await db.update(expenseClaims)
        .set({
          status: 'claimed',
          claimId: claimId,
          claimedAt: new Date()
        })
        .where(inArray(expenseClaims.id, existingIds))
    }
  }

  return { success: true }
})

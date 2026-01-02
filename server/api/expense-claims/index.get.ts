import { db } from 'hub:db'
import { eq, or, isNull } from 'drizzle-orm'
import { expenseClaims, expenses, categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = query.status as string || 'pending'

  // Fetch all categories for P2C mapping lookup
  const allCategories = await db.select().from(categories)
  const categoryMap = new Map(
    allCategories.map(c => [
      c.name,
      { mfbCategory: c.mfbCategory, mfbPercent: c.defaultMfbPercent }
    ])
  )

  // Helper to derive P2C mapping from expense items
  function derivePtcMapping(expense: any) {
    try {
      if (!expense.items) return { ptcCategory: null, mfbPercent: null, mfbAmount: null, mmrAmount: null, gstAmount: null }

      const items = JSON.parse(expense.items) as any[]
      if (!items.length) return { ptcCategory: null, mfbPercent: null, mfbAmount: null, mmrAmount: null, gstAmount: null }

      // Find item with highest lineTotal (dominant category)
      const dominantItem = items.reduce((prev, curr) =>
        (curr.lineTotal || 0) > (prev.lineTotal || 0) ? curr : prev
      )

      if (!dominantItem.category) return { ptcCategory: null, mfbPercent: null, mfbAmount: null, mmrAmount: null, gstAmount: null }

      const mapping = categoryMap.get(dominantItem.category)
      if (!mapping || !mapping.mfbCategory) return { ptcCategory: null, mfbPercent: null, mfbAmount: null, mmrAmount: null, gstAmount: null }

      const mfbPercent = mapping.mfbPercent ?? 100
      const total = expense.total || 0
      const mfbAmount = total * (mfbPercent / 100)
      const mmrAmount = total - mfbAmount
      const gstAmount = expense.tax || 0

      return { ptcCategory: mapping.mfbCategory, mfbPercent, mfbAmount, mmrAmount, gstAmount }
    } catch (e) {
      console.error('Error deriving PTC mapping:', e)
      return { ptcCategory: null, mfbPercent: null, mfbAmount: null, mmrAmount: null, gstAmount: null }
    }
  }

  if (status === 'archived') {
    const rawResults = await db.select({
      id: expenseClaims.id,
      expenseId: expenseClaims.expenseId,
      claimId: expenseClaims.claimId,
      status: expenseClaims.status,
      createdAt: expenseClaims.createdAt,
      claimedAt: expenseClaims.claimedAt,
      expense: expenses
    })
    .from(expenseClaims)
    .innerJoin(expenses, eq(expenseClaims.expenseId, expenses.id))
    .where(eq(expenseClaims.status, 'archived'))
    .all()

    return rawResults.map(row => ({
      ...row,
      ...derivePtcMapping(row.expense)
    }))
  }

  if (status === 'claimed') {
    const rawResults = await db.select({
      id: expenseClaims.id,
      expenseId: expenseClaims.expenseId,
      claimId: expenseClaims.claimId,
      status: expenseClaims.status,
      createdAt: expenseClaims.createdAt,
      claimedAt: expenseClaims.claimedAt,
      expense: expenses
    })
    .from(expenseClaims)
    .innerJoin(expenses, eq(expenseClaims.expenseId, expenses.id))
    .where(eq(expenseClaims.status, 'claimed'))
    .all()

    return rawResults.map(row => ({
      ...row,
      ...derivePtcMapping(row.expense)
    }))
  }

  // Default: pending (unclaimed)
  const allExpenses = await db.select({
    expense: expenses,
    claim: {
      id: expenseClaims.id,
      expenseId: expenseClaims.expenseId,
      claimId: expenseClaims.claimId,
      status: expenseClaims.status,
      createdAt: expenseClaims.createdAt,
      claimedAt: expenseClaims.claimedAt,
    }
  })
  .from(expenses)
  .leftJoin(expenseClaims, eq(expenses.id, expenseClaims.expenseId))
  .where(
    or(
      isNull(expenseClaims.id),
      eq(expenseClaims.status, 'pending')
    )
  )
  .all()

  return allExpenses.map(row => ({
    ...row.claim,
    expense: row.expense,
    ...derivePtcMapping(row.expense)
  }))
})

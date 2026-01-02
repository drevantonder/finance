import { db } from 'hub:db'
import { inArray, eq } from 'drizzle-orm'
import { claims, expenseClaims, expenses, categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { id, financialYear, claimDate, expenseClaimIds, notes } = body as { id: string, financialYear: string, claimDate: string, expenseClaimIds: string[], notes?: string }

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
      if (!expense.items) return { mfbPercent: null, mfbAmount: null, mmrAmount: null, gstAmount: null }

      const items = JSON.parse(expense.items) as any[]
      if (!items.length) return { mfbPercent: null, mfbAmount: null, mmrAmount: null, gstAmount: null }

      // Find item with highest lineTotal (dominant category)
      const dominantItem = items.reduce((prev, curr) =>
        (curr.lineTotal || 0) > (prev.lineTotal || 0) ? curr : prev
      )

      if (!dominantItem.category) return { mfbPercent: null, mfbAmount: null, mmrAmount: null, gstAmount: null }

      const mapping = categoryMap.get(dominantItem.category)
      if (!mapping || !mapping.mfbCategory) return { mfbPercent: null, mfbAmount: null, mmrAmount: null, gstAmount: null }

      const mfbPercent = mapping.mfbPercent ?? 100
      const total = expense.total || 0
      const mfbAmount = total * (mfbPercent / 100)
      const mmrAmount = total - mfbAmount
      const gstAmount = expense.tax || 0

      return { mfbPercent, mfbAmount, mmrAmount, gstAmount }
    } catch (e) {
      console.error('Error deriving PTC mapping:', e)
      return { mfbPercent: null, mfbAmount: null, mmrAmount: null, gstAmount: null }
    }
  }

  // 1. Get expense claims with their expense data
  const claimsWithExpenses = await db.select({
      claimId: expenseClaims.id,
      expenseId: expenseClaims.expenseId,
      status: expenseClaims.status,
      expense: expenses
    })
    .from(expenseClaims)
    .innerJoin(expenses, eq(expenseClaims.expenseId, expenses.id))
    .where(inArray(expenseClaims.id, expenseClaimIds))
    .all()

  // 2. Derive P2C values for each expense
  const claimsWithMappings = claimsWithExpenses.map(row => {
    const mapping = derivePtcMapping(row.expense)
    return {
      ...row,
      ...mapping
    }
  })

  // 3. Calculate totals
  const totals = claimsWithMappings.reduce((acc, c) => ({
    total: acc.total + (c.mfbAmount || 0) + (c.mmrAmount || 0),
    mfb: acc.mfb + (c.mfbAmount || 0),
    mmr: acc.mmr + (c.mmrAmount || 0),
    gst: acc.gst + (c.gstAmount || 0)
  }), { total: 0, mfb: 0, mmr: 0, gst: 0 })

  // 4. Create claim record
  const newClaim = {
    id,
    financialYear,
    claimDate,
    totalAmount: totals.total,
    mfbAmount: totals.mfb,
    mmrAmount: totals.mmr,
    gstAmount: totals.gst,
    expenseCount: expenseClaimIds.length,
    notes,
    createdAt: new Date()
  }

  await db.insert(claims).values(newClaim)

  // 5. Update expense_claims status
  const claimIds = claimsWithMappings.map(c => c.claimId as string)
  await db.update(expenseClaims)
    .set({
      status: 'claimed',
      claimId: id,
      claimedAt: new Date()
    })
    .where(inArray(expenseClaims.id, claimIds))

  return newClaim
})

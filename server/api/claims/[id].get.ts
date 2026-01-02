import { db } from 'hub:db'
import { eq } from 'drizzle-orm'
import { claims, expenseClaims, expenses } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return

  const claim = await db.select()
    .from(claims)
    .where(eq(claims.id, id))
    .get()

  if (!claim) {
    throw createError({ statusCode: 404, statusMessage: 'Claim not found' })
  }

  const linkedExpenses = await db.select({
    claim: expenseClaims,
    expense: expenses
  })
  .from(expenseClaims)
  .innerJoin(expenses, eq(expenseClaims.expenseId, expenses.id))
  .where(eq(expenseClaims.claimId, id))
  .all()

  return {
    ...claim,
    expenses: linkedExpenses.map(row => ({
      ...row.claim,
      expense: row.expense
    }))
  }
})

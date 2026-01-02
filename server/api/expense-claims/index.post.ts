import { db } from 'hub:db'
import { expenseClaims } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const id = crypto.randomUUID()

  const newClaim = {
    id,
    expenseId: body.expenseId,
    claimId: body.claimId || null,
    status: body.status || 'pending',
    claimedAt: body.claimedAt ? new Date(body.claimedAt) : undefined
  }

  await db.insert(expenseClaims).values(newClaim)
  return newClaim
})

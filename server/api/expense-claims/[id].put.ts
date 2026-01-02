import { db } from 'hub:db'
import { eq } from 'drizzle-orm'
import { expenseClaims } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return

  const body = await readBody(event)

  await db.update(expenseClaims)
    .set({
      claimId: body.claimId,
      status: body.status,
      claimedAt: body.claimedAt ? new Date(body.claimedAt) : undefined
    })
    .where(eq(expenseClaims.id, id))

  return { success: true }
})

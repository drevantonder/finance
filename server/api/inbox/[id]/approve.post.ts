import { db } from 'hub:db'
import { inboxItems } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { processInboxItem } from '~~/server/utils/inbox'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  // 1. Mark as verified manually
  await db.update(inboxItems)
    .set({ verified: true, status: 'pending' })
    .where(eq(inboxItems.id, id))

  // 2. Trigger processing immediately
  const result = await processInboxItem(id)

  // Notify other devices
  const { user } = await requireUserSession(event)
  if (user?.email) {
    await broadcastInboxChanged(user.email)
    await broadcastExpensesChanged(user.email)
  }

  return result
})

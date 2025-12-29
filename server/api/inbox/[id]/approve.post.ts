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
  const session = await requireUserSession(event)
  const email = (session.user as any).email
  if (email) {
    await broadcastInboxChanged(email)
    await broadcastExpensesChanged(email)
  }

  return result
})

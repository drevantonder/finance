import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { inboxItems, inboxAttachments } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { broadcastInboxChanged } from '~~/server/utils/broadcast'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  try {
    // 1. Get attachments to delete from R2
    const attachments = await db.select()
      .from(inboxAttachments)
      .where(eq(inboxAttachments.inboxItemId, id))
      .all()

    for (const attachment of attachments) {
      if (attachment.storageKey) {
        await blob.delete(attachment.storageKey).catch(err => {
          console.error(`Failed to delete blob ${attachment.storageKey}:`, err)
        })
      }
    }

    // 2. Delete attachment records
    await db.delete(inboxAttachments)
      .where(eq(inboxAttachments.inboxItemId, id))

    // 3. Delete inbox item
    await db.delete(inboxItems)
      .where(eq(inboxItems.id, id))

    // Notify other devices
    const session = await requireUserSession(event)
    const email = (session.user as any).email
    if (email) {
      broadcastInboxChanged(email)
    }

    return { success: true }
  } catch (err: any) {
    console.error(`[InboxDelete] Error deleting ${id}:`, err)
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'Failed to delete inbox item' 
    })
  }
})

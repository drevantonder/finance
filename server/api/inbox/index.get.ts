import { db } from 'hub:db'
import { inboxItems, inboxAttachments } from '~~/server/db/schema'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const items = await db.select()
      .from(inboxItems)
      .orderBy(desc(inboxItems.receivedAt))
      .all()

    // Enrich with attachments
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const attachments = await db.select()
        .from(inboxAttachments)
        .where(eq(inboxAttachments.inboxItemId, item.id))
        .all()
      
      return {
        ...item,
        attachments
      }
    }))

    return enrichedItems
  } catch (err) {
    console.error('Failed to fetch inbox items:', err)
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
})

import { db } from 'hub:db'
import { inboxItems, inboxAttachments } from '~~/server/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const items = await db.select()
      .from(inboxItems)
      .where(eq(inboxItems.verified, true)) // or adjust based on your logic
      .orderBy(desc(inboxItems.receivedAt))

    if (items.length === 0) return []

    const itemIds = items.map(i => i.id)
    const allAttachments = await db.select()
      .from(inboxAttachments)
      .where(inArray(inboxAttachments.inboxItemId, itemIds))

    // Group attachments by inboxItemId
    const attachmentsByItemId = new Map<string, any[]>()
    for (const att of allAttachments) {
      const existing = attachmentsByItemId.get(att.inboxItemId) || []
      existing.push(att)
      attachmentsByItemId.set(att.inboxItemId, existing)
    }

    return items.map(item => ({
      ...item,
      attachments: attachmentsByItemId.get(item.id) || []
    }))
  } catch (err: unknown) {
    console.error('Fetch inbox error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch inbox' })
  }
})


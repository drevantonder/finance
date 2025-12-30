import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { inboxItems, inboxAttachments } from '~~/server/db/schema'
import { desc, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const email = (session.user as any).email
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const items = await db.select()
      .from(inboxItems)
      .orderBy(desc(inboxItems.receivedAt))

    if (items.length === 0) return []

    const itemIds = items.map(i => i.id)
    const allAttachments = await db.select()
      .from(inboxAttachments)
      .where(inArray(inboxAttachments.inboxItemId, itemIds))

    // Check blob existence for all attachments in parallel
    const attachmentsWithStatus = await Promise.all(
      allAttachments.map(async (att) => {
        const exists = await blob.head(att.storageKey).catch(() => null)
        return {
          ...att,
          blobExists: !!exists
        }
      })
    )

    // Group attachments by inboxItemId
    const attachmentsByItemId = new Map<string, any[]>()
    for (const att of attachmentsWithStatus) {
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


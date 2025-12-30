import { blob } from 'hub:blob'
import { db } from 'hub:db'
import { expenses, inboxItems, inboxAttachments } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  // Get the actual key from the DB to support both .jpg and .pdf
  const result = await db.select({
    id: expenses.id,
    imageKey: expenses.imageKey
  })
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1)

  if (!result || result.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
  }

  const expense = result[0]!
  const imageKey = expense.imageKey || ''

  // Handle email-body case (no image available)
  if (imageKey === 'email-body') {
    throw createError({ statusCode: 404, statusMessage: 'No image available - receipt was extracted from email body text' })
  }

  // 1. Check if blob exists
  const exists = await blob.head(imageKey).catch(() => null)
  
  if (!exists) {
    console.warn(`[ImageRepair] Blob missing for expense ${id}: ${imageKey}. Attempting repair...`)
    
    // 2. Try to repair from inbox attachments
    const inboxItem = await db.select()
      .from(inboxItems)
      .where(eq(inboxItems.expenseId, id))
      .get()

    if (inboxItem) {
      const attachments = await db.select()
        .from(inboxAttachments)
        .where(eq(inboxAttachments.inboxItemId, inboxItem.id))
        .all()

      // Find original attachment (either matching storageKey or first PDF/Image)
      const attachment = attachments.find(a => a.storageKey === imageKey) 
        || attachments.find(a => a.mimeType === 'application/pdf' || a.mimeType.startsWith('image/'))

      if (attachment) {
        const sourceBlob = await blob.get(attachment.storageKey).catch(() => null)
        if (sourceBlob) {
          // Found source! Copy to stable receipts/ location
          const ext = attachment.filename?.split('.').pop() || (attachment.mimeType === 'application/pdf' ? 'pdf' : 'jpg')
          const newKey = `receipts/${id}.${ext}`
          
          await blob.put(newKey, await sourceBlob.arrayBuffer(), {
            contentType: attachment.mimeType,
            addMetadata: {
              repairedFrom: attachment.storageKey,
              expenseId: id
            }
          })

          // Update expense record
          await db.update(expenses)
            .set({ imageKey: newKey, updatedAt: new Date() })
            .where(eq(expenses.id, id))

          console.log(`[ImageRepair] Successfully repaired expense ${id} using inbox attachment. New key: ${newKey}`)
          return blob.serve(event, newKey)
        }
      }
    }
    
    console.error(`[ImageRepair] Repair failed for expense ${id}. No source blob found in inbox attachments.`)
    throw createError({ statusCode: 404, statusMessage: 'Receipt image not found and could not be repaired' })
  }

  return blob.serve(event, imageKey!)
})


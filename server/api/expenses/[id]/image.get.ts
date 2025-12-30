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

  // Handle email-body case - return the email HTML/text content
  if (imageKey === 'email-body') {
    // Find the linked inbox item to get email content
    const inboxItem = await db.select({
      htmlBody: inboxItems.htmlBody,
      textBody: inboxItems.textBody,
      subject: inboxItems.subject,
      fromAddress: inboxItems.fromAddress
    })
      .from(inboxItems)
      .where(eq(inboxItems.expenseId, id))
      .get()

    if (inboxItem && (inboxItem.htmlBody || inboxItem.textBody)) {
      // Return as HTML with proper content type
      const content = inboxItem.htmlBody || `<pre style="white-space: pre-wrap; font-family: monospace;">${inboxItem.textBody}</pre>`
      
      // Wrap in a styled container
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0; 
      padding: 16px;
      background: #f9fafb;
    }
    .email-header {
      background: #1f2937;
      color: white;
      padding: 12px 16px;
      margin: -16px -16px 16px -16px;
      font-size: 12px;
    }
    .email-header strong { color: #9ca3af; }
    .email-content {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="email-header">
    <div><strong>From:</strong> ${inboxItem.fromAddress || 'Unknown'}</div>
    <div><strong>Subject:</strong> ${inboxItem.subject || '(no subject)'}</div>
  </div>
  <div class="email-content">
    ${content}
  </div>
</body>
</html>`

      setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
      return html
    }

    throw createError({ statusCode: 404, statusMessage: 'No email content available' })
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


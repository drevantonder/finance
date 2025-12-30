import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { inboxItems, inboxAttachments, expenses, logs } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { extractReceiptData } from '~~/server/utils/gemini'
import { createExpenseIfNotDuplicate } from '~~/server/utils/expenses'
import { extractText, getDocumentProxy } from 'unpdf'

/**
 * Shared utility to process an inbox item into an expense
 */
export async function processInboxItem(id: string) {
  try {
    // 1. Fetch Inbox Item
    const item = await db.select().from(inboxItems).where(eq(inboxItems.id, id)).get()
    if (!item) throw new Error('Inbox item not found')

    // 2. Mark as processing
    await db.update(inboxItems).set({ status: 'processing' }).where(eq(inboxItems.id, id))

    // 3. Get Attachments
    const attachments = await db.select().from(inboxAttachments).where(eq(inboxAttachments.inboxItemId, id)).all()

    let extractionInput: { image?: string, text?: string } = {}
    
    // 4. Prioritize PDF/Image attachments for extraction
    const document = attachments.find(a => a.mimeType === 'application/pdf')
    const image = attachments.find(a => a.mimeType.startsWith('image/'))

    if (document) {
      const file = await blob.get(document.storageKey)
      if (file) {
        const buffer = await file.arrayBuffer()
        const pdf = await getDocumentProxy(new Uint8Array(buffer))
        const { text } = await extractText(pdf, { mergePages: true })
        extractionInput = { text }
      }
    } else if (image) {
      const file = await blob.get(image.storageKey)
      if (file) {
        const buffer = await file.arrayBuffer()
        extractionInput = { image: Buffer.from(buffer).toString('base64') }
      }
    } else {
      // Fallback to HTML body
      extractionInput = { text: item.htmlBody || item.textBody || '' }
    }

    // 5. Extract with Gemini
    const extraction = await extractReceiptData(extractionInput)
    
    // 6. Create Expense (with duplicate detection)
    const result = await createExpenseIfNotDuplicate({
      imageKey: document?.storageKey || image?.storageKey || 'email-body',
      merchant: extraction.merchant || 'Unknown',
      date: extraction.date,
      total: extraction.total,
      currency: extraction.currency,
      tax: extraction.tax,
      items: extraction.items,
      rawExtraction: extraction,
      capturedAt: new Date(item.receivedAt),
    })

    // 7. Update Inbox Item
    await db.update(inboxItems)
      .set({ 
        status: 'complete', 
        expenseId: result.id,
        verified: true 
      })
      .where(eq(inboxItems.id, id))

    // 8. Log Success
    await db.insert(logs).values({
      id: crypto.randomUUID(),
      level: result.isDuplicate ? 'info' : 'success',
      message: result.isDuplicate 
        ? `Duplicate email receipt from ${item.fromAddress} - linked to existing expense`
        : `Processed email receipt from ${item.fromAddress}`,
      source: 'system',
      details: JSON.stringify({ inboxId: id, expenseId: result.id, merchant: extraction.merchant, isDuplicate: result.isDuplicate }),
      createdAt: new Date()
    })

    return { success: true, expenseId: result.id, isDuplicate: result.isDuplicate }

  } catch (err: any) {
    console.error(`[InboxProcess] Error processing ${id}:`, err)
    
    await db.update(inboxItems)
      .set({ status: 'error', errorMessage: err.message })
      .where(eq(inboxItems.id, id))

    throw err
  }
}

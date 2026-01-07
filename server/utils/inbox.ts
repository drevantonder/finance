import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { inboxItems, inboxAttachments } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { extractReceiptData, classifyEmail } from '~~/server/utils/gemini'
import { createExpenseIfNotDuplicate } from '~~/server/utils/expenses'
import { extractText, getDocumentProxy } from 'unpdf'
import { logActivity } from '~~/server/utils/logger'

/**
 * Shared utility to process an inbox item into an expense
 */
export async function processInboxItem(id: string) {
  const correlationId = `inbox-${id}`
  const startTime = performance.now()
  
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

    // 4b. Classify email to determine if it's a receipt
    const classification = await classifyEmail(extractionInput)
    
    // Log classification decision
    await logActivity({
      type: 'pipeline',
      level: classification.isReceipt ? 'info' : 'warn',
      message: `Email classification: ${classification.isReceipt ? 'receipt' : 'ignored'} - ${classification.reason}`,
      correlationId,
      durationMs: Math.round(performance.now() - startTime),
      metadata: { 
        inboxId: id, 
        isReceipt: classification.isReceipt, 
        confidence: classification.confidence,
        reason: classification.reason,
        suggestedMerchant: classification.suggestedMerchant
      }
    })

    // 4c. If not a receipt, mark as ignored and skip extraction
    if (!classification.isReceipt) {
      await db.update(inboxItems)
        .set({ status: 'ignored' })
        .where(eq(inboxItems.id, id))

      return { success: true, ignored: true, reason: classification.reason }
    }

    // 5. Extract with Gemini (only for receipts)
    const extraction = await extractReceiptData(extractionInput)
    
    // 6. Create or Update Expense (with duplicate detection)
    // If inbox item already has an expenseId (reprocessing), pass it to update existing
    const result = await createExpenseIfNotDuplicate({
      id: item.expenseId || undefined,
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
    await logActivity({
      type: 'pipeline',
      level: result.isDuplicate ? 'info' : 'success',
      message: result.isDuplicate 
        ? `Duplicate email receipt from ${item.fromAddress} - linked to existing expense`
        : `Processed email receipt from ${item.fromAddress}`,
      correlationId,
      expenseId: result.id,
      durationMs: Math.round(performance.now() - startTime),
      metadata: { inboxId: id, merchant: extraction.merchant, isDuplicate: result.isDuplicate }
    })

    return { success: true, expenseId: result.id, isDuplicate: result.isDuplicate }

  } catch (err: any) {
    console.error(`[InboxProcess] Error processing ${id}:`, err)
    
    await db.update(inboxItems)
      .set({ status: 'error', errorMessage: err.message })
      .where(eq(inboxItems.id, id))

    await logActivity({
      type: 'error',
      level: 'error',
      message: `Failed to process email receipt from ${id}`,
      correlationId,
      metadata: { error: err.message, inboxId: id }
    })

    throw err
  }
}

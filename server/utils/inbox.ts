import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { inboxItems, inboxAttachments, expenses, logs } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { extractReceiptData } from '~~/server/utils/gemini'
import { generateReceiptHash } from '~~/server/utils/hash'
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
    
    // 6. Create Expense
    const expenseId = crypto.randomUUID()
    const merchant = extraction.merchant || 'Unknown'
    const receiptString = `${merchant.toLowerCase().trim()}_${extraction.date}_${Number(extraction.total).toFixed(2)}`
    const receiptHash = await generateReceiptHash(receiptString)

    await db.insert(expenses).values({
      id: expenseId,
      merchant,
      total: extraction.total,
      tax: extraction.tax,
      date: extraction.date,
      status: 'complete',
      imageKey: document?.storageKey || image?.storageKey || 'email-body',
      capturedAt: new Date(item.receivedAt),
      items: JSON.stringify(extraction.items),
      receiptHash,
      schemaVersion: 3,
      rawExtraction: JSON.stringify(extraction),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // 7. Update Inbox Item
    await db.update(inboxItems)
      .set({ 
        status: 'complete', 
        expenseId,
        verified: true 
      })
      .where(eq(inboxItems.id, id))

    // 8. Log Success
    await db.insert(logs).values({
      id: crypto.randomUUID(),
      level: 'success',
      message: `Processed email receipt from ${item.fromAddress}`,
      source: 'system',
      details: JSON.stringify({ inboxId: id, expenseId, merchant }),
      createdAt: new Date()
    })

    return { success: true, expenseId }

  } catch (err: any) {
    console.error(`[InboxProcess] Error processing ${id}:`, err)
    
    await db.update(inboxItems)
      .set({ status: 'error', errorMessage: err.message })
      .where(eq(inboxItems.id, id))

    throw err
  }
}

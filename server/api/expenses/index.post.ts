import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { extractReceiptData } from '~~/server/utils/gemini'

export default defineEventHandler(async (event) => {
  const { image, capturedAt, imageHash } = await readBody(event)

  if (!image) {
    throw createError({ statusCode: 400, statusMessage: 'Image is required' })
  }

  const id = crypto.randomUUID()
  const imageKey = `receipts/${id}.jpg`
  const now = new Date()

  try {
    // 1. Upload to R2
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    await blob.put(imageKey, buffer, {
      contentType: 'image/jpeg'
    })

    // 2. Create DB record
    const newExpense = {
      id,
      imageKey,
      imageHash,
      status: 'pending',
      schemaVersion: 3,
      capturedAt: capturedAt ? new Date(capturedAt) : now,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(expenses).values(newExpense)

    // 3. Trigger initial processing (sync for MVP)
    try {
      const extraction = await extractReceiptData(base64Data)
      
      // Generate receipt hash: merchant_date_total
      const receiptString = `${extraction.merchant.toLowerCase().trim()}_${extraction.date}_${Number(extraction.total).toFixed(2)}`
      const { createHash } = await import('node:crypto')
      const receiptHash = createHash('sha256').update(receiptString).digest('hex')

      await db.update(expenses)
        .set({
          status: 'complete',
          total: extraction.total,
          tax: extraction.tax,
          merchant: extraction.merchant,
          date: extraction.date,
          items: JSON.stringify(extraction.items),
          receiptHash,
          schemaVersion: 3,
          rawExtraction: JSON.stringify(extraction),
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, id))
        
      // Log success
      await $fetch('/api/logs', {
        method: 'POST',
        body: {
          level: 'success',
          message: `Processed receipt for ${extraction.merchant}`,
          source: 'expenses',
          details: JSON.stringify({ id, total: extraction.total })
        }
      }).catch(() => {})
    } catch (processErr) {
      console.error('Initial processing error:', processErr)
      await db.update(expenses)
        .set({ status: 'error', updatedAt: new Date() })
        .where(eq(expenses.id, id))
        
      // Log error
      await $fetch('/api/logs', {
        method: 'POST',
        body: {
          level: 'error',
          message: `Failed to process receipt ${id.slice(0, 8)}`,
          source: 'expenses',
          details: JSON.stringify({ error: String(processErr) })
        }
      }).catch(() => {})
    }

    // Fetch the updated expense to return
    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1)
    return result[0]
  } catch (err: unknown) {
    console.error('Create expense error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save expense' })
  }
})


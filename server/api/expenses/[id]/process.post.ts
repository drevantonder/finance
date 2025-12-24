import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { extractReceiptData } from '~~/server/utils/gemini'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  try {
    const result = await db.select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1)

    if (!result || result.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
    }

    const expense = result[0]
    
    // 1. Mark as processing
    await db.update(expenses)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(expenses.id, id))

    // 2. Fetch image from R2
    const blobData = await blob.get(expense.imageKey)
    if (!blobData) {
      throw createError({ statusCode: 404, statusMessage: 'Image not found in storage' })
    }
    
    const arrayBuffer = await blobData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // 3. Extract data via Gemini
    try {
      const extraction = await extractReceiptData(base64)
      
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
          message: `Reprocessed receipt for ${extraction.merchant}`,
          source: 'expenses',
          details: JSON.stringify({ id, total: extraction.total })
        }
      }).catch(() => {})
    } catch (processErr) {
      console.error('Processing error:', processErr)
      await db.update(expenses)
        .set({ status: 'error', updatedAt: new Date() })
        .where(eq(expenses.id, id))
        
      // Log error
      await $fetch('/api/logs', {
        method: 'POST',
        body: {
          level: 'error',
          message: `Failed to reprocess receipt ${id.slice(0, 8)}`,
          source: 'expenses',
          details: JSON.stringify({ error: String(processErr) })
        }
      }).catch(() => {})
        
      throw createError({
        statusCode: 500,
        statusMessage: 'AI processing failed',
        message: processErr instanceof Error ? processErr.message : String(processErr)
      })
    }

    const updated = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1)
    return updated[0]
  } catch (err: unknown) {
    console.error('Process expense error:', err)
    throw err
  }
})


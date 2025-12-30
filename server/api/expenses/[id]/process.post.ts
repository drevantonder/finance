import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { extractReceiptData } from '~~/server/utils/gemini'
import { createExpenseIfNotDuplicate } from '~~/server/utils/expenses'
import { broadcastExpensesChanged } from '~~/server/utils/broadcast'
import { extractText, getDocumentProxy } from 'unpdf'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })
  const expenseId = id as string

  try {
    const result = await db.select()
      .from(expenses)
      .where(eq(expenses.id, expenseId))
      .limit(1)

    if (!result || result.length === 0 || !result[0]) {
      throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
    }

    const expense = result[0]
    const imageKey = expense.imageKey || ''
    const isPdf = imageKey.toLowerCase().endsWith('.pdf')
    
    // 1. Mark as processing
    await db.update(expenses)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(expenses.id, expenseId))

    // 2. Fetch file from storage
    const blobData = await blob.get(imageKey)
    if (!blobData) {
      throw createError({ statusCode: 404, statusMessage: 'File not found in storage' })
    }
    
    const arrayBuffer = await blobData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    // 3. Extract text if PDF
    let pdfText: string | undefined
    if (isPdf) {
      try {
        const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer))
        const result = await extractText(pdf, { mergePages: true })
        pdfText = result.text
      } catch (e) {
        console.error('PDF text extraction failed:', e)
      }
    }

    // 4. Extract data via Gemini
    try {
      const extraction = await extractReceiptData(isPdf ? { text: pdfText } : { image: base64 })
      
      const result = await createExpenseIfNotDuplicate({
        id: expenseId,
        imageKey,
        imageHash: expense.imageHash,
        merchant: extraction.merchant || 'Unknown',
        date: extraction.date,
        total: extraction.total,
        tax: extraction.tax,
        items: extraction.items,
        rawExtraction: extraction,
        capturedAt: expense.capturedAt || new Date(),
      })

      // Notify other devices
      const session = await requireUserSession(event)
      const email = (session.user as any).email
      if (email) {
        broadcastExpensesChanged(email)
      }
        
      // Log success (fire-and-forget)
      $fetch('/api/logs', {
        method: 'POST',
        body: {
          level: result.isDuplicate ? 'info' : 'success',
          message: result.isDuplicate 
            ? `Reprocessed receipt: detected duplicate and merged`
            : `Reprocessed receipt for ${extraction.merchant || 'Unknown'}`,
          source: 'expenses',
          details: JSON.stringify({ id: expenseId, total: extraction.total, isDuplicate: result.isDuplicate })
        }
      }).catch(() => {})

      const final = await db.select().from(expenses).where(eq(expenses.id, result.id)).limit(1).get()
      if (!final) throw new Error('Failed to retrieve updated expense')
      return final
    } catch (processErr) {
      console.error('Processing error:', processErr)
      await db.update(expenses)
        .set({ status: 'error', updatedAt: new Date() })
        .where(eq(expenses.id, expenseId))
        
      // Log error (fire-and-forget)
      $fetch('/api/logs', {
        method: 'POST',
        body: {
          level: 'error',
          message: `Failed to reprocess receipt ${expenseId.slice(0, 8)}`,
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
  } catch (err: unknown) {
    console.error('Process expense error:', err)
    throw err
  }
})


import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { extractReceiptData } from '~~/server/utils/gemini'
import { createExpenseIfNotDuplicate } from '~~/server/utils/expenses'
import { broadcastExpensesChanged } from '~~/server/utils/broadcast'
import { extractText, getDocumentProxy } from 'unpdf'
import { logActivity } from '~~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  const session = await requireUserSession(event)
  const email = (session.user as any).email

  try {
    // Fetch the expense
    const expense = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1).get()
    if (!expense) {
      throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
    }

    // Only allow retry for pending, processing (stale), or failed expenses
    if (expense.status === 'complete') {
      throw createError({ statusCode: 400, statusMessage: 'Expense is already complete' })
    }

    // Fetch the blob content
    const blobData = await blob.get(expense.imageKey)
    if (!blobData) {
      throw createError({ statusCode: 404, statusMessage: 'Original image not found' })
    }

    const arrayBuffer = await blobData.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')
    const isPdf = expense.imageKey.endsWith('.pdf')
    const isWebp = expense.imageKey.endsWith('.webp')
    const contentType = isPdf ? 'application/pdf' : isWebp ? 'image/webp' : 'image/jpeg'

    // Extract text if PDF
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

    // Update status to processing
    await db.update(expenses)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(expenses.id, id))

    // Trigger AI processing in background with timeout
    const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
    event.waitUntil((async () => {
      const startGemini = performance.now()
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), TIMEOUT_MS)
      })

      try {
        const extraction = await Promise.race([
          extractReceiptData(isPdf ? { text: pdfText } : { image: base64Data, mimeType: contentType }),
          timeoutPromise
        ]) as any

        await createExpenseIfNotDuplicate({
          id,
          imageKey: expense.imageKey,
          imageHash: expense.imageHash,
          merchant: extraction.merchant || 'Unknown',
          date: extraction.date,
          total: extraction.total,
          currency: extraction.currency,
          tax: extraction.tax,
          items: extraction.items,
          rawExtraction: extraction,
          capturedAt: expense.capturedAt,
        })

        // Notify other devices
        if (email) {
          broadcastExpensesChanged(email)
        }
      } catch (processErr) {
        console.error('AI Processing error:', processErr)
        await db.update(expenses).set({ status: 'failed', updatedAt: new Date() }).where(eq(expenses.id, id))

        logActivity({
          type: 'error',
          level: 'error',
          message: `AI Processing retry failed for ${id}`,
          stage: 'retry_gemini',
          metadata: { error: (processErr as Error).message },
          expenseId: id
        })

        if (email) {
          broadcastExpensesChanged(email)
        }
      }
    })())

    return { id, status: 'processing' }
  } catch (err: unknown) {
    console.error('Retry expense error:', err)
    // If it's already an error with statusCode (from createError), rethrow it
    const error = err as any
    if (error?.statusCode) {
      throw error
    }
    throw createError({ statusCode: 500, statusMessage: 'Failed to retry processing' })
  }
})

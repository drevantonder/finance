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
  const startTotal = performance.now()
  
  // 0. Size Limit Check (10MB for PDFs)
  const contentLength = getHeader(event, 'content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'Payload too large (max 10MB)' })
  }

  const { image, capturedAt, imageHash, correlationId, timing: clientTiming } = await readBody(event)

  if (!image) {
    throw createError({ statusCode: 400, statusMessage: 'File data is required' })
  }

  const id = crypto.randomUUID()
  const isPdf = image.startsWith('data:application/pdf')
  const isWebp = image.startsWith('data:image/webp')
  const ext = isPdf ? 'pdf' : isWebp ? 'webp' : 'jpg'
  const imageKey = `receipts/${id}.${ext}`
  const now = new Date()

  try {
    // 1. Process and Upload
    const startBlob = performance.now()
    const base64Data = image.replace(/^data:.*?;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    const contentType = isPdf ? 'application/pdf' : isWebp ? 'image/webp' : 'image/jpeg'
    await blob.put(imageKey, buffer, { contentType })
    const blobDuration = Math.round(performance.now() - startBlob)

    // 2. Extract text if PDF
    let pdfText: string | undefined
    let pdfDuration = 0
    if (isPdf) {
      const startPdf = performance.now()
      try {
        const pdf = await getDocumentProxy(new Uint8Array(buffer))
        const result = await extractText(pdf, { mergePages: true })
        pdfText = result.text
        pdfDuration = Math.round(performance.now() - startPdf)
      } catch (e) {
        console.error('PDF text extraction failed:', e)
        logActivity({
          type: 'error',
          level: 'error',
          message: 'PDF text extraction failed',
          correlationId,
          stage: 'server_pdf',
          metadata: { error: (e as Error).message },
          expenseId: id
        })
      }
    }

    // 3. Create DB record with 'processing' status
    const startDb = performance.now()
    const newExpense = {
      id,
      imageKey,
      imageHash,
      status: 'processing',
      schemaVersion: 4,
      capturedAt: capturedAt ? new Date(capturedAt) : now,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(expenses).values(newExpense)
    const dbDuration = Math.round(performance.now() - startDb)

    // 4. Trigger AI processing in background
    const session = await requireUserSession(event)
    const email = (session.user as any).email

    const serverTiming = {
      blob: blobDuration,
      pdf: pdfDuration,
      db_init: dbDuration
    }

    event.waitUntil((async () => {
      const startGemini = performance.now()
      const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

      // Timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), TIMEOUT_MS)
      })

      try {
        const extraction = await Promise.race([
          extractReceiptData(isPdf ? { text: pdfText } : { image: base64Data, mimeType: contentType }),
          timeoutPromise
        ])
        const geminiDuration = Math.round(performance.now() - startGemini)
        
        const startFinish = performance.now()
        const result = await createExpenseIfNotDuplicate({
          id,
          imageKey,
          imageHash,
          merchant: extraction.merchant || 'Unknown',
          date: extraction.date,
          total: extraction.total,
          currency: extraction.currency,
          tax: extraction.tax,
          items: extraction.items,
          rawExtraction: extraction,
          capturedAt: capturedAt ? new Date(capturedAt) : now,
        })
        const finishDuration = Math.round(performance.now() - startFinish)

        // Log pipeline summary
        const totalDuration = Math.round(performance.now() - startTotal)
        logActivity({
          type: 'pipeline',
          level: 'success',
          message: `Pipeline complete: ${extraction.merchant || 'Unknown'}`,
          correlationId,
          expenseId: id,
          durationMs: totalDuration,
          metadata: {
            stages: {
              ...clientTiming,
              ...serverTiming,
              gemini: geminiDuration,
              db_finish: finishDuration
            },
            isDuplicate: result.isDuplicate,
            merchant: extraction.merchant,
            total: extraction.total
          }
        })

        // Notify other devices
        if (email) {
          broadcastExpensesChanged(email)
        }
      } catch (processErr) {
        console.error('AI Processing error:', processErr)
        await db.update(expenses).set({ status: 'error', updatedAt: new Date() }).where(eq(expenses.id, id))
        
        logActivity({
          type: 'error',
          level: 'error',
          message: 'AI Processing failed',
          correlationId,
          stage: 'server_gemini',
          metadata: { error: (processErr as Error).message },
          expenseId: id
        })

        if (email) {
          broadcastExpensesChanged(email)
        }
      }
    })())

    return newExpense
  } catch (err: unknown) {
    console.error('Create expense error:', err)
    logActivity({
      type: 'error',
      level: 'error',
      message: 'Failed to save expense',
      correlationId,
      metadata: { error: (err as Error).message },
      expenseId: id
    })
    throw createError({ statusCode: 500, statusMessage: 'Failed to save expense' })
  }
})

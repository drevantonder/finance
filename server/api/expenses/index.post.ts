import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses, logs } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { extractReceiptData } from '~~/server/utils/gemini'
import { createExpenseIfNotDuplicate } from '~~/server/utils/expenses'
import { broadcastExpensesChanged } from '~~/server/utils/broadcast'
import { extractText, getDocumentProxy } from 'unpdf'

export default defineEventHandler(async (event) => {
  // 0. Size Limit Check (10MB for PDFs)
  const contentLength = getHeader(event, 'content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'Payload too large (max 10MB)' })
  }

  const { image, capturedAt, imageHash } = await readBody(event)

  if (!image) {
    throw createError({ statusCode: 400, statusMessage: 'File data is required' })
  }

  const id = crypto.randomUUID()
  const isPdf = image.startsWith('data:application/pdf')
  const imageKey = `receipts/${id}.${isPdf ? 'pdf' : 'jpg'}`
  const now = new Date()

  try {
    // 1. Process and Upload
    const base64Data = image.replace(/^data:.*?;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    await blob.put(imageKey, buffer, {
      contentType: isPdf ? 'application/pdf' : 'image/jpeg'
    })

    // 2. Extract text if PDF
    let pdfText: string | undefined
    if (isPdf) {
      try {
        const pdf = await getDocumentProxy(new Uint8Array(buffer))
        const result = await extractText(pdf, { mergePages: true })
        pdfText = result.text
      } catch (e) {
        console.error('PDF text extraction failed:', e)
      }
    }

    // 3. Create DB record
    const newExpense = {
      id,
      imageKey,
      imageHash,
      status: 'pending',
      schemaVersion: 4,
      capturedAt: capturedAt ? new Date(capturedAt) : now,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(expenses).values(newExpense)

    // 4. Trigger AI processing in background
    const session = await requireUserSession(event)
    const email = (session.user as any).email

    event.waitUntil((async () => {
      try {
        const extraction = await extractReceiptData(isPdf ? { text: pdfText } : { image: base64Data })
        
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

        if (result.isDuplicate) {
          await db.insert(logs).values({
            id: crypto.randomUUID(),
            level: 'info',
            message: `Duplicate receipt detected: ${extraction.merchant || 'Unknown'} - linked to existing expense`,
            source: 'expenses',
            details: JSON.stringify({ imageHash, merchant: extraction.merchant, id: result.id }),
            createdAt: new Date()
          }).catch(e => console.error('Failed to log duplicate to DB:', e))
        }

        // Notify other devices
        if (email) {
          broadcastExpensesChanged(email)
        }
      } catch (processErr) {
        console.error('AI Processing error:', processErr)
        await db.update(expenses).set({ status: 'failed', updatedAt: new Date() }).where(eq(expenses.id, id))
        if (email) {
          broadcastExpensesChanged(email)
        }
      }
    })())

    return {
      ...newExpense,
      status: 'processing'
    }
  } catch (err: unknown) {
    console.error('Create expense error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save expense' })
  }
})


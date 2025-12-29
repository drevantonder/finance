import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses, logs } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { extractReceiptData } from '~~/server/utils/gemini'
import { generateReceiptHash } from '~~/server/utils/hash'
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
      schemaVersion: 3,
      capturedAt: capturedAt ? new Date(capturedAt) : now,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(expenses).values(newExpense)

    // 4. Trigger AI processing
    try {
      const extraction = await extractReceiptData(isPdf ? { text: pdfText } : { image: base64Data })
      
      // Generate receipt hash: merchant_date_total
      const merchant = extraction.merchant || 'unknown'
      const receiptString = `${merchant.toLowerCase().trim()}_${extraction.date}_${Number(extraction.total).toFixed(2)}`
      const receiptHash = await generateReceiptHash(receiptString)

      await db.update(expenses)
        .set({
          status: 'complete',
          total: extraction.total,
          tax: extraction.tax,
          merchant,
          date: extraction.date,
          items: JSON.stringify(extraction.items),
          receiptHash,
          schemaVersion: 3,
          rawExtraction: JSON.stringify(extraction),
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, id))
    } catch (processErr) {
      console.error('Processing error:', processErr)
      // Update status to error if AI fails
      await db.update(expenses)
        .set({ 
          status: 'error', 
          updatedAt: new Date() 
        })
        .where(eq(expenses.id, id))
        
      // Log the error for debugging
      await db.insert(logs).values({
        id: crypto.randomUUID(),
        level: 'error',
        message: `AI extraction failed for ${isPdf ? 'PDF' : 'Image'}`,
        source: 'expenses',
        details: JSON.stringify({ id, error: String(processErr) }),
        createdAt: new Date()
      }).catch(e => console.error('Failed to log error to DB:', e))

      throw processErr
    }

    // Fetch the updated expense to return
    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1)
    
    // Notify other devices
    const session = await requireUserSession(event)
    const email = (session.user as any).email
    if (email) {
      await broadcastExpensesChanged(email)
    }

    return result[0]
  } catch (err: unknown) {
    console.error('Create expense error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save expense' })
  }
})


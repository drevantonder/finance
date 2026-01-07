import { db } from 'hub:db'
import { expenses, activityLog } from '~~/server/db/schema'
import { eq, lt, and, sql } from 'drizzle-orm'
import { extractReceiptData } from '~~/server/utils/gemini'
import { createExpenseIfNotDuplicate } from '~~/server/utils/expenses'
import { broadcastExpensesChanged } from '~~/server/utils/broadcast'
import { blob } from 'hub:blob'
import { extractText, getDocumentProxy } from 'unpdf'

const TEN_MINUTES_AGO = new Date(Date.now() - 10 * 60 * 1000)

export default defineEventHandler(async (event) => {
  // Only allow cron authentication
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const results = {
    checked: 0,
    repaired: 0,
    failed: 0,
    skipped: 0
  }

  try {
    // Find expenses stuck in 'processing' status for more than 10 minutes
    const stuckExpenses = await db.select()
      .from(expenses)
      .where(and(
        eq(expenses.status, 'processing'),
        lt(expenses.updatedAt, TEN_MINUTES_AGO)
      ))
      .limit(50)

    results.checked = stuckExpenses.length

    for (const expense of stuckExpenses) {
      const maxRetries = 3
      const currentRetries = expense.retryCount ?? 0

      if (currentRetries >= maxRetries) {
        // Mark as error after max retries
        await db.update(expenses)
          .set({ status: 'error', updatedAt: new Date() })
          .where(eq(expenses.id, expense.id))
        
        await db.insert(activityLog).values({
          id: crypto.randomUUID(),
          type: 'system',
          level: 'warn',
          message: `Expense ${expense.id.slice(0, 8)} marked as error after ${maxRetries} repair attempts`,
          expenseId: expense.id,
          source: 'server',
          createdAt: new Date()
        })
        
        results.failed++
        continue
      }

      try {
        // Increment retry count
        await db.update(expenses)
          .set({ 
            status: 'processing', 
            retryCount: sql`${expenses.retryCount} + 1`,
            updatedAt: new Date() 
          })
          .where(eq(expenses.id, expense.id))

        // Re-process the expense (similar to [id]/process.post.ts)
        const imageKey = expense.imageKey || ''
        const isPdf = imageKey.toLowerCase().endsWith('.pdf')
        
        const blobData = await blob.get(imageKey)
        if (!blobData) {
          throw new Error('File not found in storage')
        }
        
        const arrayBuffer = await blobData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')

        let pdfText: string | undefined
        if (isPdf) {
          try {
            const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer))
            const result = await extractText(pdf, { mergePages: true })
            pdfText = result.text
          } catch (e) {
            console.error('PDF text extraction failed during repair:', e)
          }
        }

        const extraction = await extractReceiptData(isPdf ? { text: pdfText } : { image: base64 })
        
        await createExpenseIfNotDuplicate({
          id: expense.id,
          imageKey,
          imageHash: expense.imageHash,
          merchant: extraction.merchant || 'Unknown',
          date: extraction.date,
          total: extraction.total,
          currency: extraction.currency,
          tax: extraction.tax,
          items: extraction.items,
          rawExtraction: extraction,
          capturedAt: expense.capturedAt || new Date(),
        })

        // Log successful repair
        await db.insert(activityLog).values({
          id: crypto.randomUUID(),
          type: 'system',
          level: 'success',
          message: `Expense ${expense.id.slice(0, 8)} repaired successfully (attempt ${currentRetries + 1})`,
          expenseId: expense.id,
          source: 'server',
          metadata: JSON.stringify({ retryCount: currentRetries + 1, merchant: extraction.merchant }),
          createdAt: new Date()
        })

        broadcastExpensesChanged('system')
        
        results.repaired++
      } catch (repairErr) {
        console.error('Repair error for expense', expense.id, repairErr)
        
        await db.insert(activityLog).values({
          id: crypto.randomUUID(),
          type: 'error',
          level: 'error',
          message: `Failed to repair expense ${expense.id.slice(0, 8)} (attempt ${currentRetries + 1})`,
          expenseId: expense.id,
          source: 'server',
          metadata: JSON.stringify({ error: String(repairErr), retryCount: currentRetries + 1 }),
          createdAt: new Date()
        })
        
        results.failed++
      }
    }

    // Log cron run summary
    await db.insert(activityLog).values({
      id: crypto.randomUUID(),
      type: 'system',
      level: results.failed > 0 ? 'warn' : 'info',
      message: `Repair cron completed: ${results.checked} checked, ${results.repaired} repaired, ${results.failed} failed`,
      source: 'server',
      metadata: JSON.stringify(results),
      createdAt: new Date()
    })

    return results
  } catch (err) {
    console.error('Repair cron error:', err)
    
    await db.insert(activityLog).values({
      id: crypto.randomUUID(),
      type: 'error',
      level: 'error',
      message: 'Repair cron failed',
      source: 'server',
      metadata: JSON.stringify({ error: String(err) }),
      createdAt: new Date()
    })
    
    throw createError({ statusCode: 500, statusMessage: 'Repair cron failed' })
  }
})

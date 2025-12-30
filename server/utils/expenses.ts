import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { generateReceiptHash } from './hash'

export interface CreateExpenseInput {
  id?: string
  imageKey: string
  imageHash?: string | null
  merchant: string
  date: string
  total: number
  tax?: number | null
  items: any[]
  rawExtraction: any
  capturedAt: Date
}

export interface CreateExpenseResult {
  id: string
  isDuplicate: boolean
}

/**
 * Shared utility to create an expense if it's not a duplicate based on receiptHash.
 * If it is a duplicate, the newly uploaded blob is deleted to prevent orphans.
 */
export async function createExpenseIfNotDuplicate(
  input: CreateExpenseInput
): Promise<CreateExpenseResult> {
  // Generate receipt hash: merchant_date_total
  const merchant = input.merchant || 'Unknown'
  const receiptString = `${merchant.toLowerCase().trim()}_${input.date}_${Number(input.total).toFixed(2)}`
  const receiptHash = await generateReceiptHash(receiptString)

  // Check for existing duplicate
  const existing = await db.select({ id: expenses.id })
    .from(expenses)
    .where(eq(expenses.receiptHash, receiptHash))
    .limit(1)
    .get()

  if (existing) {
    // Delete the newly uploaded blob to prevent orphans
    try {
      if (input.imageKey && input.imageKey !== 'email-body') {
        await blob.delete(input.imageKey)
      }
    } catch (e) {
      console.warn('Failed to delete duplicate blob:', input.imageKey, e)
    }

    // If we have a pending record, delete it as it's a duplicate of an existing one
    if (input.id && input.id !== existing.id) {
      await db.delete(expenses).where(eq(expenses.id, input.id))
    }
    
    return { id: existing.id, isDuplicate: true }
  }

  // Update existing or insert new expense
  const id = input.id || crypto.randomUUID()
  const now = new Date()
  
  const values = {
    imageKey: input.imageKey,
    imageHash: input.imageHash,
    receiptHash,
    merchant,
    date: input.date,
    total: input.total,
    tax: input.tax,
    items: JSON.stringify(input.items),
    rawExtraction: JSON.stringify(input.rawExtraction),
    capturedAt: input.capturedAt,
    status: 'complete' as const,
    schemaVersion: 3,
    updatedAt: now,
  }

  if (input.id) {
    await db.update(expenses).set(values).where(eq(expenses.id, input.id))
  } else {
    await db.insert(expenses).values({
      ...values,
      id,
      createdAt: now,
    })
  }

  return { id, isDuplicate: false }
}

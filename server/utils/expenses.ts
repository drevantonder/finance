import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { generateReceiptHash } from './hash'
import { getExchangeRate } from './exchange'
import { findMatchingMerchant } from './merchants'

export interface CreateExpenseInput {
  id?: string
  imageKey: string
  imageHash?: string | null
  merchant: string
  date: string
  total: number
  currency?: string | null
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
  // Normalize merchant name via fuzzy matching
  const originalMerchant = input.merchant || 'Unknown'
  const merchant = await findMatchingMerchant(originalMerchant)

  // Generate receipt hash: merchant_date_total
  const receiptString = `${merchant.toLowerCase().trim()}_${input.date}_${Number(input.total).toFixed(2)}`
  const receiptHash = await generateReceiptHash(receiptString)

  // 1. Currency Handling
  const currency = input.currency || 'AUD'
  let total = input.total
  let tax = input.tax
  let items = input.items || []
  let originalTotal: number | null = null
  let exchangeRate: number | null = null

  if (currency !== 'AUD') {
    exchangeRate = await getExchangeRate(currency, 'AUD', input.date)
    if (exchangeRate) {
      originalTotal = input.total
      total = Number((input.total * exchangeRate).toFixed(2))
      if (tax) tax = Number((tax * exchangeRate).toFixed(2))

      // Convert items
      items = items.map((item: any) => ({
        ...item,
        originalUnitPrice: item.unitPrice,
        originalLineTotal: item.lineTotal,
        unitPrice: Number((item.unitPrice * exchangeRate!).toFixed(2)),
        lineTotal: Number((item.lineTotal * exchangeRate!).toFixed(2))
      }))
    } else {
      // API failed or rate missing - store original but keep total as-is (flagged via currency)
      originalTotal = input.total
    }
  }

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
    total,
    currency,
    originalTotal,
    exchangeRate,
    tax,
    items: JSON.stringify(items),
    rawExtraction: JSON.stringify(input.rawExtraction),
    capturedAt: input.capturedAt,
    status: 'complete' as const,
    schemaVersion: 4,
    updatedAt: now,
  }

  if (input.id) {
    // Check if expense still exists (might have been deleted)
    const existingExpense = await db.select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.id, input.id))
      .get()
    
    if (existingExpense) {
      await db.update(expenses).set(values).where(eq(expenses.id, input.id))
      return { id: input.id, isDuplicate: false }
    }
    // Expense was deleted, fall through to insert with new ID
  }
  
  // Insert new expense
  const newId = input.id || crypto.randomUUID()
  await db.insert(expenses).values({
    ...values,
    id: newId,
    createdAt: now,
  })

  return { id: newId, isDuplicate: false }
}

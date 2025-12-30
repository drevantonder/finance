import { db } from 'hub:db'
import { blob } from 'hub:blob'
import { expenses, inboxItems } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { broadcastExpensesChanged } from '~~/server/utils/broadcast'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  try {
    // 1. Get the expense and check for linked inbox item
    const result = await db.select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1)

    const expense = result?.[0]
    if (expense?.imageKey && expense.imageKey !== 'email-body') {
      const imageKey = expense.imageKey
      
      // Check if this blob belongs to an inbox attachment
      // Inbox blobs have paths like "inbox/{inboxItemId}/filename.pdf"
      const isInboxBlob = imageKey.startsWith('inbox/')
      
      if (isInboxBlob) {
        // Check if the inbox item still exists
        const linkedInbox = await db.select({ id: inboxItems.id })
          .from(inboxItems)
          .where(eq(inboxItems.expenseId, id))
          .get()
        
        if (!linkedInbox) {
          // Inbox item was deleted, safe to delete the blob
          await blob.delete(imageKey).catch(e => 
            console.warn(`[ExpenseDelete] Failed to delete orphaned inbox blob: ${imageKey}`, e)
          )
        }
        // If inbox item exists, don't delete - the blob belongs to the inbox
      } else {
        // Regular receipts/ blob - safe to delete
        await blob.delete(imageKey).catch(e => 
          console.warn(`[ExpenseDelete] Failed to delete blob: ${imageKey}`, e)
        )
      }
    }

    // 2. Clear references in inbox items (unlink but don't delete)
    await db.update(inboxItems)
      .set({ expenseId: null, status: 'pending' })
      .where(eq(inboxItems.expenseId, id))

    // 3. Delete from DB
    await db.delete(expenses)
      .where(eq(expenses.id, id))

    // Notify other devices
    const session = await requireUserSession(event)
    const email = (session.user as any).email
    if (email) {
      broadcastExpensesChanged(email)
    }

    return { success: true }
  } catch (err: unknown) {
    console.error('Delete expense error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete expense' })
  }
})


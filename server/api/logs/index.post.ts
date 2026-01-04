import { db } from 'hub:db'
import { activityLog } from '~~/server/db/schema'
import { lt } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // Support single entry or array of entries
  const entries = Array.isArray(body) ? body : [body]
  
  const toInsert = entries.map(entry => ({
    id: crypto.randomUUID(),
    correlationId: entry.correlationId || null,
    type: entry.type || 'system',
    stage: entry.stage || null,
    level: entry.level || 'info',
    message: entry.message,
    durationMs: entry.durationMs || null,
    metadata: entry.metadata ? (typeof entry.metadata === 'string' ? entry.metadata : JSON.stringify(entry.metadata)) : null,
    expenseId: entry.expenseId || null,
    source: entry.source || 'client',
  }))

  if (toInsert.length > 0) {
    await db.insert(activityLog).values(toInsert)
  }

  // 90-day cleanup
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  
  // Run cleanup asynchronously
  db.delete(activityLog).where(lt(activityLog.createdAt, ninetyDaysAgo)).execute().catch(err => {
    console.error('Cleanup failed:', err)
  })

  return { success: true, count: toInsert.length }
})

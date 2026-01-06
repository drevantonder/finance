import { db } from 'hub:db'
import { desc, and, eq, gte, lte, sql } from 'drizzle-orm'
import { activityLog } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 100
  const type = query.type as string
  const level = query.level as string
  const correlationId = query.correlationId as string
  const stage = query.stage as string

  // Date range filtering
  const hours = Number(query.hours)
  const dateFilter = hours
    ? sql`${activityLog.createdAt} >= datetime('now', '-${hours} hours')`
    : undefined

  const filters = []
  if (type) filters.push(eq(activityLog.type, type))
  if (level) filters.push(eq(activityLog.level, level))
  if (correlationId) filters.push(eq(activityLog.correlationId, correlationId))
  if (stage) filters.push(eq(activityLog.stage, stage))
  if (dateFilter) filters.push(dateFilter)

  return await db.select()
    .from(activityLog)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
})

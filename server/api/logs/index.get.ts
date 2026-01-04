import { db } from 'hub:db'
import { desc, and, eq } from 'drizzle-orm'
import { activityLog } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 100
  const type = query.type as string
  const level = query.level as string
  const correlationId = query.correlationId as string

  const filters = []
  if (type) filters.push(eq(activityLog.type, type))
  if (level) filters.push(eq(activityLog.level, level))
  if (correlationId) filters.push(eq(activityLog.correlationId, correlationId))

  return await db.select()
    .from(activityLog)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
})

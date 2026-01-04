import { db } from 'hub:db'
import { activityLog } from '~~/server/db/schema'
import type { ActivityLogType, ActivityLogLevel } from '~/types'

export async function logActivity(params: {
  type: ActivityLogType
  level: ActivityLogLevel
  message: string
  correlationId?: string
  stage?: string
  durationMs?: number
  metadata?: any
  expenseId?: string
}) {
  try {
    await db.insert(activityLog).values({
      id: crypto.randomUUID(),
      type: params.type,
      level: params.level,
      message: params.message,
      correlationId: params.correlationId || null,
      stage: params.stage || null,
      durationMs: params.durationMs || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      expenseId: params.expenseId || null,
      source: 'server',
    })
  } catch (err) {
    console.error('Failed to log activity:', err)
  }
}

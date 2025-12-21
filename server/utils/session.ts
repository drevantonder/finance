import { db } from 'hub:db'
import { sessions } from '~~/server/db/schema'

/**
 * Type guard: check if value is a plain object (not array, not null)
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validate and save a session configuration to the database
 * @param config - The session configuration object
 * @param maxSizeKb - Maximum serialized size in KB (default: 512)
 * @returns The server-assigned updatedAt timestamp (Unix ms)
 */
export async function upsertSession(config: unknown, maxSizeKb = 512): Promise<number> {
  // Validate structure
  if (!isPlainObject(config)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid configuration object' })
  }

  // Serialize and check size
  const serialized = JSON.stringify(config)
  if (serialized.length > maxSizeKb * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'Configuration too large' })
  }

  // Server-authoritative timestamp
  const now = new Date()

  await db.insert(sessions)
    .values({
      id: 'default',
      config: serialized,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: sessions.id,
      set: {
        config: serialized,
        updatedAt: now
      }
    })

  return now.getTime()
}

/**
 * Set no-store cache headers on a response
 */
export function setNoStore(event: any) {
  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
}

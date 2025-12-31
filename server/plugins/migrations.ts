import { applyDatabaseMigrations, applyDatabaseQueries } from '@nuxthub/core/dist/db/lib/migrations'
import { db } from 'hub:db'

/**
 * Production migration plugin for Cloudflare D1
 *
 * NuxtHub's built-in migration plugin only runs in dev mode.
 * This plugin calls the same migration functions in production.
 */
export default defineNitroPlugin(async () => {
  // Skip in dev - NuxtHub's plugin handles this
  if (import.meta.dev) return

  const hub = useRuntimeConfig().hub
  if (!hub.db) return

  console.log('[migrations] Running production migrations...')

  try {
    await applyDatabaseMigrations(hub, db)
    await applyDatabaseQueries(hub, db)
    console.log('[migrations] Done')
  } catch (error) {
    console.error('[migrations] Failed:', error)
  }
})

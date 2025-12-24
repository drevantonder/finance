import { ref, watch, type Ref } from 'vue'
import { useLogger } from '~/composables/useLogger'
import { get, set } from 'idb-keyval'
import { watchDebounced, useOnline } from '@vueuse/core'
import type { SessionConfig } from '../types'
import { clonePlain } from '~/utils/clone'

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error'

const CACHE_KEY = 'hp_session_cache'

export const useSyncEngine = (config: Ref<SessionConfig>) => {
  const online = useOnline()
  const logger = useLogger()
  
  const status = ref<SyncStatus>('synced')
  const lastSyncedAt = ref<number | null>(null)
  const error = ref<string | null>(null)
  const pendingPush = ref(false)

  // Load from local cache (IndexedDB)
  const loadFromCache = async () => {
    const cached = await get<{ config: SessionConfig, updatedAt: number }>(CACHE_KEY)
    if (cached) {
      return cached
    }
    return null
  }

  // Save to local cache
  const saveToCache = async (data: SessionConfig, updatedAt: number) => {
    // Deep clone to ensure we're not passing Proxies to structuredClone (idb)
    const cleanData = clonePlain(data)
    await set(CACHE_KEY, { config: cleanData, updatedAt })
  }

  const handleAuthError = (e: unknown) => {
    const err = e as { statusCode?: number }
    if (err.statusCode === 401) {
      status.value = 'error'
      error.value = 'Session expired'
      return true
    }
    return false
  }

  const pull = async () => {
    if (!online.value) return

    status.value = 'syncing'
    try {
      const response = await $fetch<{ config: SessionConfig, updatedAt: number }>('/api/session')

      if (response.config) {
        const cached = await loadFromCache()
        // Simple last-write-wins based on updatedAt
        if (!cached || response.updatedAt > cached.updatedAt) {
          config.value = response.config
          await saveToCache(response.config, response.updatedAt)
          lastSyncedAt.value = response.updatedAt
        }
      }
      status.value = 'synced'
      error.value = null
      logger.success('Synced session data from cloud', 'sync')
    } catch (e: unknown) {
      if (!handleAuthError(e)) {
        status.value = 'error'
        const err = e as { message?: string }
        error.value = err.message || 'Failed to pull from server'
        logger.error('Failed to pull sync data', 'sync', { error: String(e) })
      }
    }
  }

  const push = async () => {
    if (!online.value) {
      pendingPush.value = true
      status.value = 'offline'
      return
    }

    status.value = 'syncing'
    try {
      const cleanData = clonePlain(config.value)
      const response = await $fetch<{ success: boolean, updatedAt: number }>('/api/session', {
        method: 'PUT',
        body: { config: cleanData }
      })

      if (response.success) {
        await saveToCache(config.value, response.updatedAt)
        lastSyncedAt.value = response.updatedAt
        pendingPush.value = false
        status.value = 'synced'
        error.value = null
        logger.info('Saved changes to cloud', 'sync')
      }
    } catch (e: unknown) {
      if (!handleAuthError(e)) {
        status.value = 'error'
        const err = e as { message?: string }
        error.value = err.message || 'Failed to push to server'
        pendingPush.value = true
        logger.warn('Failed to push sync data (offline?)', 'sync')
      }
    }
  }


  // Sync on online/offline changes
  watch(online, (isOnline) => {
    if (isOnline && (pendingPush.value || status.value === 'error')) {
      push()
    } else if (!isOnline) {
      status.value = 'offline'
    }
  })

  // Debounced push on config changes
  watchDebounced(config, () => {
    push()
  }, { debounce: 2000, deep: true })

  return {
    status,
    lastSyncedAt,
    error,
    pull,
    push,
    loadFromCache
  }
}

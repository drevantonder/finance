import { get, set } from 'idb-keyval'
import { watchDebounced, useOnline } from '@vueuse/core'
import type { SessionConfig } from '../types'
import { clonePlain } from '~/utils/clone'

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error'

const CACHE_KEY = 'hp_session_cache'

export const useSyncEngine = (config: Ref<SessionConfig>) => {
  const { token, isAuthenticated, clearToken } = useAuthToken()
  const online = useOnline()
  
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
      clearToken()
      status.value = 'error'
      error.value = 'Session expired or invalid token'
      return true
    }
    return false
  }

  const pull = async () => {
    if (!isAuthenticated.value || !online.value) return

    status.value = 'syncing'
    try {
      const response = await $fetch<{ config: SessionConfig | null, updatedAt: number }>('/api/session', {
        headers: {
          'x-auth-token': token.value || ''
        }
      })

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
    } catch (e: unknown) {
      if (!handleAuthError(e)) {
        status.value = 'error'
        const err = e as { message?: string }
        error.value = err.message || 'Failed to pull from server'
      }
    }
  }

  const push = async () => {
    if (!isAuthenticated.value || !online.value) {
      pendingPush.value = true
      status.value = online.value ? 'synced' : 'offline'
      return
    }

    status.value = 'syncing'
    try {
      const cleanData = clonePlain(config.value)
      const response = await $fetch<{ success: boolean, updatedAt: number }>('/api/session', {
        method: 'PUT',
        body: { config: cleanData },
        headers: {
          'x-auth-token': token.value || ''
        }
      })

      if (response.success) {
        await saveToCache(config.value, response.updatedAt)
        lastSyncedAt.value = response.updatedAt
        pendingPush.value = false
        status.value = 'synced'
        error.value = null
      }
    } catch (e: unknown) {
      if (!handleAuthError(e)) {
        status.value = 'error'
        const err = e as { message?: string }
        error.value = err.message || 'Failed to push to server'
        pendingPush.value = true
      }
    }
  }

  const migrate = async (localConfig: SessionConfig) => {
    if (!isAuthenticated.value || !online.value) return false

    status.value = 'syncing'
    try {
      const cleanData = clonePlain(localConfig)
      const response = await $fetch<{ success: boolean, updatedAt: number }>('/api/session/migrate', {
        method: 'POST',
        body: { config: cleanData },
        headers: {
          'x-auth-token': token.value || ''
        }
      })

      if (response.success) {
        config.value = localConfig
        await saveToCache(localConfig, response.updatedAt)
        lastSyncedAt.value = response.updatedAt
        status.value = 'synced'
        return true
      }
    } catch (e: unknown) {
      if (!handleAuthError(e)) {
        status.value = 'error'
        const err = e as { message?: string }
        error.value = err.message || 'Migration failed'
      }
    }
    return false
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
    migrate,
    loadFromCache,
    isAuthenticated
  }
}

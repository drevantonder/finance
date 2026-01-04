import type { ActivityLogType, ActivityLogLevel, ActivityLog } from '~/types'

export const useActivityLogger = () => {
  const recentErrors = new Map<string, number>()

  const log = async (params: {
    type: ActivityLogType
    level: ActivityLogLevel
    message: string
    correlationId?: string
    stage?: string
    durationMs?: number
    metadata?: any
    expenseId?: string
  }) => {
    // Basic console logging for dev
    if (import.meta.dev) {
      const color = params.level === 'error' ? 'red' : params.level === 'warn' ? 'orange' : params.level === 'success' ? 'green' : 'inherit'
      console.log(`%c[${params.type.toUpperCase()}] ${params.message}`, `color: ${color}`, params)
    }

    try {
      await $fetch('/api/logs', {
        method: 'POST',
        body: {
          ...params,
          source: 'client'
        }
      })
    } catch (err) {
      console.error('Failed to send log to server:', err)
    }
  }

  const logError = (message: string, error?: any, metadata?: any) => {
    const errorStack = error?.stack || ''
    const errorKey = `${message}-${errorStack}`.slice(0, 200)
    
    // Throttle duplicate errors (60s)
    const now = Date.now()
    if (recentErrors.has(errorKey)) {
      const lastSeen = recentErrors.get(errorKey)!
      if (now - lastSeen < 60000) return
    }
    recentErrors.set(errorKey, now)

    log({
      type: 'error',
      level: 'error',
      message,
      metadata: {
        ...metadata,
        error: error?.message || error,
        stack: errorStack
      }
    })

    // Show toast if available
    const toast = useToast()
    if (toast) {
      toast.add({
        title: 'Error',
        description: message,
        color: 'error'
      })
    }
  }

  const logPipeline = (params: {
    message: string
    correlationId: string
    level?: ActivityLogLevel
    stage?: string
    durationMs?: number
    metadata?: any
    expenseId?: string
  }) => {
    log({
      type: 'pipeline',
      level: params.level || 'info',
      ...params
    })
  }

  return {
    log,
    logError,
    logPipeline
  }
}

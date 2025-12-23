import { ref } from 'vue'
import type { LogEntry, LogLevel } from '~/types'

const logs = ref<LogEntry[]>([])

export const useLogger = () => {
  async function log(level: LogLevel, message: string, source: string, details?: any) {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      level,
      message,
      source,
      details: details ? JSON.stringify(details) : null,
      ip: null, // Set on server
      createdAt: new Date()
    }

    // Add to local state (newest first)
    logs.value.unshift(entry)
    if (logs.value.length > 100) logs.value.pop()

    // Persist to DB for significant events
    if (['error', 'warn', 'success'].includes(level)) {
      try {
        await $fetch('/api/logs', {
          method: 'POST',
          body: {
            level,
            message,
            source,
            details: entry.details
          }
        })
      } catch (err) {
        console.error('Failed to persist log:', err)
      }
    }
  }

  return {
    logs,
    info: (message: string, source: string, details?: any) => log('info', message, source, details),
    success: (message: string, source: string, details?: any) => log('success', message, source, details),
    warn: (message: string, source: string, details?: any) => log('warn', message, source, details),
    error: (message: string, source: string, details?: any) => log('error', message, source, details)
  }
}

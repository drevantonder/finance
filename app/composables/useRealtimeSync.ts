import { useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/types/queries'
import { onMounted, onUnmounted, ref } from 'vue'

export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const isConnected = ref(false)

  let eventSource: EventSource | null = null

  const connect = () => {
    if (!import.meta.client || eventSource) return

    const connectStart = performance.now()
    eventSource = new EventSource('/api/events')

    eventSource.onopen = () => {
      isConnected.value = true
      window.dispatchEvent(new CustomEvent('sse:connected', {
        detail: { durationMs: performance.now() - connectStart }
      }))
    }

    eventSource.onerror = () => {
      isConnected.value = false
      // Reconnect after 5s
      setTimeout(() => {
        if (eventSource) {
          eventSource.close()
          eventSource = null
        }
        connect()
      }, 5_000)
    }

    eventSource.addEventListener('expenses-changed', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    })

    eventSource.addEventListener('inbox-changed', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all })
    })

    eventSource.addEventListener('categories-changed', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    })

    eventSource.addEventListener('claims-changed', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseClaims.all })
    })
  }

  const disconnect = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    isConnected.value = false
  }

  onMounted(connect)
  onUnmounted(disconnect)

  return { isConnected }
}

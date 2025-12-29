 <script setup lang="ts">
 import { useUploadQueue } from '~/composables/useUploadQueue'
 import { useRealtimeSync } from '~/composables/useRealtimeSync'
 import { useQueryClient } from '@tanstack/vue-query'

 const store = useUploadQueue()
 const queryClient = useQueryClient()
 const sessionStore = useSessionStore()
 const { isConnected } = useRealtimeSync()
 const isOnline = useOnline()

 const isSyncing = computed(() => queryClient.isFetching() > 0 || sessionStore.isLoading || sessionStore.isSyncing)

const status = computed(() => {
  // 1. Error state (highest priority)
  if (store.errorCount > 0) {
    return {
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
      text: `${store.errorCount} Failed`,
      bg: 'bg-red-50 text-red-600 border-red-100',
      badge: 'bg-red-500 text-white'
    }
  }

  // 2. Processing state (Gemini analyzing)
  if (store.processingCount > 0) {
    return {
      icon: 'i-heroicons-sparkles',
      color: 'indigo',
      text: 'Processing...',
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      badge: 'bg-indigo-500 text-white',
      animate: true
    }
  }

  // 3. Uploading state
  if (store.uploadingCount > 0) {
    return {
      icon: 'i-heroicons-arrow-path',
      color: 'blue',
      text: 'Uploading...',
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
      badge: 'bg-blue-500 text-white',
      spin: true
    }
  }

  // 4. Queued state (waiting for connection/slot)
  if (store.queuedCount > 0) {
    return {
      icon: 'i-heroicons-clock',
      color: 'orange',
      text: `${store.queuedCount} Queued`,
      bg: 'bg-orange-50 text-orange-600 border-orange-100',
      badge: 'bg-orange-500 text-white'
    }
  }

   // 5. Offline state
  if (!isOnline.value) {
    return {
      icon: 'i-heroicons-signal-slash',
      color: 'gray',
      text: 'Offline',
      bg: 'bg-gray-100 text-gray-500 border-gray-200',
      badge: 'bg-gray-500 text-white'
    }
  }

  // 6. Syncing state (background sync)
  if (isSyncing.value) {
    return {
      icon: 'i-heroicons-arrow-path',
      color: 'primary',
      text: 'Syncing...',
      bg: 'bg-primary-50 text-primary-600 border-primary-100',
      badge: 'bg-primary-500 text-white',
      spin: true
    }
  }

  // 7. Idle/Synced state
  return {
    icon: 'i-heroicons-cloud',
    color: 'gray',
    text: 'Synced',
    bg: 'hover:bg-gray-50 text-gray-500 border-transparent',
    badge: 'bg-gray-500 text-white'
  }
})
</script>

<template>
  <button
    class="w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-200 group text-sm"
    :class="status.bg"
  >
    <div class="relative flex items-center justify-center">
      <UIcon 
        :name="status.icon" 
        class="w-5 h-5 flex-shrink-0"
        :class="{
          'animate-pulse': status.animate,
          'animate-spin': status.spin
        }"
      />
      
      <!-- Badge for counts -->
      <span 
        v-if="store.errorCount > 0 || store.processingCount > 0 || store.uploadingCount > 0 || store.queuedCount > 0"
        class="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold ring-2 ring-white shadow-sm"
        :class="status.badge"
      >
        {{ store.errorCount || store.processingCount || store.uploadingCount || store.queuedCount }}
      </span>
    </div>

    <span class="font-medium truncate">
      {{ status.text }}
    </span>
  </button>
</template>


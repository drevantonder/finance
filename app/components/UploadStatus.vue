<script setup lang="ts">
import { useUploadQueue } from '~/composables/useUploadQueue'

const emit = defineEmits<{
  (e: 'openTray'): void
}>()

const store = useUploadQueue()

const status = computed(() => {
  // 1. Error state
  if (store.errorCount > 0) {
    return {
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
      text: `${store.errorCount} Failed`,
      bg: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100',
      badge: 'bg-red-500 text-white'
    }
  }

  // 2. Active Uploads (Uploading + Processing)
  const activeCount = store.uploadingCount + store.processingCount + store.queuedCount
  if (activeCount > 0) {
    return {
      icon: store.uploadingCount > 0 ? 'i-heroicons-arrow-up-tray' : 'i-heroicons-sparkles',
      color: 'primary',
      text: store.uploadingCount > 0 ? 'Uploading...' : 'Processing...',
      bg: 'bg-primary-50 text-primary-600 border-primary-100 hover:bg-primary-100',
      badge: 'bg-primary-500 text-white',
      animate: store.uploadingCount > 0
    }
  }

  return null
})
</script>

<template>
  <button
    v-if="status"
    class="w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-300 group text-sm shadow-sm cursor-pointer"
    :class="status.bg"
    @click="emit('openTray')"
  >
    <div class="relative flex items-center justify-center">
      <UIcon 
        :name="status.icon" 
        class="w-5 h-5 flex-shrink-0"
        :class="{ 'animate-bounce': status.animate }"
      />
      
      <span 
        class="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold ring-2 ring-white shadow-sm transition-transform group-hover:scale-110"
        :class="status.badge"
      >
        {{ store.errorCount || (store.uploadingCount + store.processingCount + store.queuedCount) }}
      </span>
    </div>

    <span class="font-medium truncate">
      {{ status.text }}
    </span>
  </button>
</template>

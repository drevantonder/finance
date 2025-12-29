<script setup lang="ts">
  const store = useUploadQueue()
  
  const emit = defineEmits(['click'])
  const { isOnline } = useNetworkStatus()
  const { isConnected: isSSEConnected } = useRealtimeSync()
  
  const icon = computed(() => {
    if (!isOnline.value) return 'i-heroicons-cloud-slash'
    if (store.hasErrors) return 'i-heroicons-exclamation-triangle'
    if (store.processingCount > 0) return 'i-heroicons-sparkles'
    if (store.isProcessing) return 'i-heroicons-arrow-up-tray'
    return 'i-heroicons-cloud'
  })
  
  const color = computed(() => {
    if (!isOnline.value) return 'text-warning-500'
    if (store.hasErrors) return 'text-error-500'
    if (store.processingCount > 0) return 'text-info-500'
    if (store.isProcessing) return 'text-primary-500'
    if (!isSSEConnected.value) return 'text-neutral-400'
    return 'text-success-500'
  })
  
  const badgeCount = computed(() => {
    if (store.hasErrors) return store.errorCount
    if (store.hasQueued) return store.queuedCount
    return 0
  })
  
  const showBadge = computed(() => badgeCount.value > 0)
  
  const statusText = computed(() => {
    if (!isOnline.value) return 'Offline'
    if (store.hasErrors) return `${store.errorCount} failed`
    
    if (store.processingCount > 0) return 'Processing...'
    const uploading = store.queue.find(i => i.status === 'uploading')
    
    if (uploading) return 'Uploading...'
    if (store.hasQueued) return `${store.queuedCount} queued`
    if (!isSSEConnected.value) return 'Connecting...'
    return 'Synced'
  })
</script>

<template>
    <button
      class="relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group flex items-center gap-2"
      :title="statusText"
      @click="emit('click')"
    >
      <div class="relative">
        <UIcon
          :name="icon"
          class="w-6 h-6 transition-transform group-active:scale-95"
          :class="[
            color,
            (store.isProcessing || store.processingCount > 0) && isOnline ? 'animate-pulse' : ''
          ]"
        />
        
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform scale-0"
          enter-to-class="transform scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform scale-100"
          leave-to-class="transform scale-0"
        >
          <span
            v-if="showBadge"
            class="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full ring-2 ring-white dark:ring-neutral-900"
            :class="store.hasErrors ? 'bg-error-500' : 'bg-primary-500'"
          >
            {{ badgeCount }}
          </span>
        </Transition>
      </div>
      
      <div role="status" aria-live="polite" class="sr-only">
        {{ statusText }}
      </div>
    </button>
</template>


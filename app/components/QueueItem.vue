<script setup lang="ts">
import type { QueueItem } from '~/composables/useUploadQueue'

const props = defineProps<{
  item: QueueItem
}>()

const { retryItem, removeItem } = useUploadQueue()

const statusIcon = computed(() => {
  switch (props.item.status) {
    case 'complete': return 'i-heroicons-check-circle'
    case 'error': return 'i-heroicons-exclamation-circle'
    case 'uploading': return 'i-heroicons-arrow-up-tray'
    case 'processing': return 'i-heroicons-sparkles'
    default: return 'i-heroicons-clock'
  }
})

const statusColor = computed(() => {
  switch (props.item.status) {
    case 'complete': return 'text-success-500'
    case 'error': return 'text-error-500'
    case 'uploading': return 'text-primary-500'
    case 'processing': return 'text-violet-500'
    default: return 'text-neutral-400'
  }
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex items-center gap-3 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl transition-all">
    <!-- Thumbnail -->
    <div class="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
      <img 
        v-if="item.file.thumbnail" 
        :src="item.file.thumbnail" 
        class="w-full h-full object-cover"
        alt="Receipt thumbnail"
      >
      <div v-else class="w-full h-full flex items-center justify-center">
        <UIcon name="i-heroicons-document" class="w-6 h-6 text-neutral-400" />
      </div>
      
      <!-- Overlays -->
      <div 
        v-if="item.status === 'uploading' || item.status === 'processing'" 
        class="absolute inset-0 bg-black/30 flex items-center justify-center"
      >
         <UIcon 
           :key="item.status"
           :name="item.status === 'processing' ? 'i-heroicons-sparkles' : 'i-heroicons-arrow-up-tray'" 
           class="w-5 h-5 text-white" 
           :class="item.status === 'processing' ? 'animate-pulse' : 'animate-bounce'"
         />
      </div>
    </div>

    <!-- Info -->
    <div class="flex-grow min-w-0">
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-medium truncate text-neutral-900 dark:text-white">
          <template v-if="item.result?.merchant">
            {{ item.result.merchant }}
          </template>
          <template v-else>
            {{ item.file.originalName }}
          </template>
        </p>
        <span class="text-[10px] text-neutral-400 whitespace-nowrap">
          {{ formatDate(item.capturedAt) }}
        </span>
      </div>

      <div class="flex items-center gap-1.5 mt-0.5">
        <UIcon :name="statusIcon" class="w-3.5 h-3.5" :class="statusColor" />
        <p class="text-[11px] font-medium" :class="statusColor">
          <template v-if="item.status === 'uploading'">Uploading...</template>
          <template v-else-if="item.status === 'processing'">Analyzing with AI...</template>
          <template v-else-if="item.status === 'queued'">Queued</template>
          <template v-else-if="item.status === 'error'">
            {{ item.error || 'Upload failed' }}
          </template>
          <template v-else-if="item.status === 'complete'">
            {{ item.result?.total ? `$${item.result.total.toFixed(2)}` : 'Complete' }}
          </template>
        </p>
      </div>
      
      <!-- Progress Bar (Uploading/Processing) -->
      <div v-if="item.status === 'uploading' || item.status === 'processing'" class="mt-2">
        <UProgress 
          size="xs" 
          :color="item.status === 'processing' ? 'info' : 'primary'" 
          animation="carousel" 
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-shrink-0 gap-1 ml-1">
      <template v-if="item.status === 'error'">
        <UButton
          icon="i-heroicons-arrow-path"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="retryItem(item.id)"
        />
      </template>
      <UButton
        icon="i-heroicons-trash"
        size="xs"
        color="neutral"
        variant="ghost"
        class="text-neutral-400 hover:text-error-500"
        @click="removeItem(item.id)"
      />
    </div>
  </div>
</template>

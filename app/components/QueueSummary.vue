<script setup lang="ts">
 const store = useUploadQueue()
 const isOnline = useOnline()
 
 const overallProgress = computed(() => {
   if (store.queue.length === 0) return 0
   const completed = store.queue.filter((i: { status: string }) => i.status === 'complete').length
   return Math.round((completed / store.queue.length) * 100)
 })
 
 const totalPending = computed(() => store.queuedCount + store.uploadingCount + store.processingCount)
 const hasActivity = computed(() => totalPending.value > 0)
</script>

<template>
   <div v-if="hasActivity" class="p-4 bg-primary-50 dark:bg-primary-950/30 border-b border-primary-100 dark:border-primary-900/50">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
         <UIcon
           :name="isOnline ? 'i-heroicons-arrow-up-tray' : 'i-heroicons-signal-slash'"
           class="w-5 h-5 text-primary-600 dark:text-primary-400"
           :class="{ 'animate-bounce': store.isProcessing && isOnline }"
         />
        <span class="text-sm font-semibold text-primary-900 dark:text-primary-100">
          <template v-if="isOnline">
            <template v-if="store.processingCount > 0">
              Processing {{ store.processingCount }} of {{ totalPending }}
            </template>
            <template v-else>
              Uploading {{ store.uploadingCount }} of {{ totalPending }}
            </template>
          </template>
          <template v-else>
            {{ totalPending }} items waiting for connection
          </template>
        </span>
      </div>
      <span class="text-xs font-bold text-primary-700 dark:text-primary-300">
        {{ overallProgress }}%
      </span>
    </div>
    
    <UProgress 
      :value="overallProgress" 
      size="sm" 
      color="primary"
      :animation="store.isProcessing && isOnline ? 'carousel' : undefined"
    />
  </div>
</template>

<script setup lang="ts">
const store = useUploadQueue()
const { isOnline } = useNetworkStatus()

const showSummary = computed(() => store.queue.length >= 5)
const processingItems = computed(() => store.queue.filter(i => i.status === 'processing'))

const items = [{
  label: 'Recently Completed',
  slot: 'completed',
  defaultOpen: false
}]
</script>

<template>
  <div class="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
    <!-- Header Summary -->
    <QueueSummary v-if="showSummary" />

    <!-- Offline Banner -->
    <div v-if="!isOnline" class="p-3 bg-warning-50 dark:bg-warning-950/30 border-b border-warning-100 dark:border-warning-900/50 flex items-center gap-3">
      <UIcon name="i-heroicons-cloud-slash" class="w-5 h-5 text-warning-600 dark:text-warning-400" />
      <div class="flex-grow">
        <p class="text-xs font-bold text-warning-900 dark:text-warning-100">You're offline</p>
        <p class="text-[10px] text-warning-700 dark:text-warning-300">Uploads will resume automatically when connected.</p>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-grow overflow-y-auto p-4 space-y-6">
      <!-- Active Uploads / Processing -->
      <section v-if="store.uploadingItems.length > 0 || processingItems.length > 0" class="space-y-3">
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">In Progress</h3>
        <QueueItem 
          v-for="item in [...store.uploadingItems, ...processingItems]" 
          :key="item.id" 
          :item="item" 
        />
      </section>

      <!-- Failed Uploads -->
      <section v-if="store.hasErrors" class="space-y-3">
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-error-500 px-1 flex items-center gap-1">
          <UIcon name="i-heroicons-exclamation-circle" class="w-3 h-3" />
          Action Required
        </h3>
        <QueueItem 
          v-for="item in store.errorItems" 
          :key="item.id" 
          :item="item" 
        />
      </section>

      <!-- Waiting in Queue -->
      <section v-if="store.queuedItems.length > 0" class="space-y-3">
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          Queued ({{ store.queuedItems.length }})
        </h3>
        <QueueItem 
          v-for="item in store.queuedItems" 
          :key="item.id" 
          :item="item" 
        />
      </section>

      <!-- Completed (Collapsible) -->
      <section v-if="store.completedItems.length > 0" class="pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <UAccordion :items="items" variant="ghost" color="neutral">
          <template #completed>
            <div class="space-y-3 mt-3">
              <QueueItem 
                v-for="item in store.completedItems" 
                :key="item.id" 
                :item="item" 
              />
              <UButton
                label="Clear history"
                variant="ghost"
                color="neutral"
                size="xs"
                block
                @click="store.clearCompleted"
              />
            </div>
          </template>
        </UAccordion>
      </section>

      <!-- Empty State -->
      <div v-if="store.queue.length === 0" class="h-64 flex flex-col items-center justify-center text-center p-8">
        <div class="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-cloud" class="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
        </div>
        <p class="text-sm font-medium text-neutral-900 dark:text-white">Your queue is empty</p>
        <p class="text-xs text-neutral-500 mt-1">Captured receipts will appear here while they upload.</p>
      </div>
    </div>
  </div>
</template>

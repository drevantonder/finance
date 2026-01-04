 <script setup lang="ts">
 import { useUploadQueue } from '~/composables/useUploadQueue'
 import { useRealtimeSync } from '~/composables/useRealtimeSync'
 import { useQueryClient } from '@tanstack/vue-query'

 const queueStore = useUploadQueue()
 const queryClient = useQueryClient()
 const sessionStore = useSessionStore()
 const { isConnected } = useRealtimeSync()
 const isOnline = useOnline()

 const isSyncing = computed(() => queryClient.isFetching() > 0 || sessionStore.isLoading || sessionStore.isSyncing)

function forceRefresh() {
  queryClient.invalidateQueries()
  sessionStore.load()
}

const hasActivity = computed(() => 
  queueStore.uploadingCount > 0 || 
  queueStore.processingCount > 0 || 
  queueStore.queuedCount > 0 ||
  queueStore.errorCount > 0
)

const hasCompleted = computed(() => queueStore.completedItems.length > 0)
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50/50">
    <!-- Header -->
    <div class="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
      <h2 class="font-semibold text-gray-900">Activity</h2>
      
       <!-- Sync Status Badge -->
       <UBadge
         :color="!isOnline ? 'error' : (isSyncing ? 'primary' : 'neutral')"
         variant="subtle"
         size="xs"
         class="transition-all duration-300"
       >
          <UIcon
            :key="!isOnline ? 'offline' : (isSyncing ? 'syncing' : 'synced')"
            :name="!isOnline ? 'i-heroicons-signal-slash' : (isSyncing ? 'i-heroicons-arrow-path' : 'i-heroicons-cloud')"
            class="mr-1.5 w-3.5 h-3.5"
            :class="{ 'animate-spin': isSyncing }"
          />
         {{ !isOnline ? 'Offline' : (isSyncing ? 'Syncing...' : 'Synced') }}
       </UBadge>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6">
       <!-- Sync Actions -->
       <div v-if="isOnline" class="grid grid-cols-2 gap-3">
        <UButton
          size="xs"
          color="neutral"
          icon="i-heroicons-arrow-path"
          :loading="isSyncing"
          block
          @click="forceRefresh"
        >
          Sync Now
        </UButton>

      </div>

       <!-- Offline Warning -->
       <div v-if="!isOnline" class="rounded-lg bg-red-50 p-3 border border-red-100 flex items-start gap-3">
        <UIcon name="i-heroicons-signal-slash" class="w-5 h-5 text-red-600 mt-0.5" />
        <div>
          <h3 class="text-sm font-medium text-red-900">You're offline</h3>
          <p class="text-xs text-red-700 mt-0.5">Uploads will automatically resume when connection is restored.</p>
        </div>
      </div>

      <!-- Queue Summary (Progress) -->
      <QueueSummary v-if="hasActivity" />

      <!-- Active Uploads -->
      <div v-if="queueStore.uploadingCount > 0" class="space-y-3">
        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-up-tray" class="w-4 h-4" />
          Uploading
        </h3>
        <div class="space-y-2">
          <QueueItem 
            v-for="item in queueStore.uploadingItems" 
            :key="item.id" 
            :item="item" 
          />
        </div>
      </div>

      <!-- Processing -->
      <div v-if="queueStore.processingCount > 0" class="space-y-3">
        <h3 class="text-xs font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-2">
          <UIcon name="i-heroicons-sparkles" class="w-4 h-4 animate-pulse" />
          Processing
        </h3>
        <div class="space-y-2">
          <QueueItem 
            v-for="item in queueStore.processingItems" 
            :key="item.id" 
            :item="item" 
          />
        </div>
      </div>

      <!-- Failed Items -->
      <div v-if="queueStore.errorCount > 0" class="space-y-3">
        <h3 class="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
          Needs Attention
        </h3>
        <div class="space-y-2">
          <QueueItem 
            v-for="item in queueStore.errorItems" 
            :key="item.id" 
            :item="item" 
          />
        </div>
      </div>

      <!-- Queued Items -->
      <div v-if="queueStore.queuedCount > 0" class="space-y-3">
        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <UIcon name="i-heroicons-clock" class="w-4 h-4" />
          Queued
          <UBadge color="neutral" variant="soft" size="xs" :label="queueStore.queuedCount" class="ml-auto" />
        </h3>
        <div class="space-y-2 opacity-75">
          <QueueItem 
            v-for="item in queueStore.queuedItems" 
            :key="item.id" 
            :item="item" 
          />
        </div>
      </div>

      <!-- Completed Items -->
      <div v-if="hasCompleted" class="pt-4 border-t border-gray-200">
        <UAccordion 
          :items="[{ label: 'Recently Completed', slot: 'completed' }]"
          color="neutral"
          variant="ghost"
          size="sm"
        >
          <template #completed>
            <div class="space-y-2 py-2">
              <QueueItem 
                v-for="item in queueStore.completedItems" 
                :key="item.id" 
                :item="item" 
              />
              <UButton 
                block 
                variant="ghost" 
                color="neutral" 
                size="xs"
                class="mt-2"
                @click="queueStore.clearCompleted()"
              >
                Clear History
              </UButton>
            </div>
          </template>
        </UAccordion>
      </div>
      
       <!-- Empty State -->
       <div v-if="!hasActivity && !hasCompleted && isOnline && !isSyncing" class="text-center py-12 text-gray-400">
        <div class="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-3 shadow-sm flex items-center justify-center">
          <UIcon name="i-heroicons-check" class="w-8 h-8 text-green-500" />
        </div>
        <p class="text-sm font-medium text-gray-900">All caught up</p>
        <p class="text-xs mt-1">Everything is synced and up to date.</p>
      </div>
    </div>
  </div>
</template>

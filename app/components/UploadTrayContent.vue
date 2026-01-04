<script setup lang="ts">
import { useUploadQueue } from '~/composables/useUploadQueue'

const queueStore = useUploadQueue()

const hasActivity = computed(() => 
  queueStore.uploadingCount > 0 || 
  queueStore.processingCount > 0 || 
  queueStore.queuedCount > 0 ||
  queueStore.errorCount > 0
)
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50/50">
    <!-- Header -->
    <div class="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
      <h2 class="font-semibold text-gray-900">Active Uploads</h2>
      
      <!-- Simple count badge -->
      <UBadge
        v-if="hasActivity"
        color="primary"
        variant="subtle"
        size="xs"
      >
        {{ queueStore.queuedCount + queueStore.uploadingCount + queueStore.processingCount }} Active
      </UBadge>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6">
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
      
      <!-- Empty State -->
      <div v-if="!hasActivity" class="text-center py-12 text-gray-400">
        <div class="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-3 shadow-sm flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-up-tray" class="w-8 h-8 text-gray-300" />
        </div>
        <p class="text-sm font-medium text-gray-900">No active uploads</p>
        <p class="text-xs mt-1">Drag and drop files to start</p>
      </div>
    </div>
  </div>
</template>

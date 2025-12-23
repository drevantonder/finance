<script setup lang="ts">
import type { LogEntry, LogLevel } from '~/types'

defineProps<{
  entry: LogEntry
}>()

const statusColors: Record<LogLevel, string> = {
  info: 'border-blue-500',
  success: 'border-green-500',
  warn: 'border-amber-500',
  error: 'border-red-500'
}

const statusIcons: Record<LogLevel, string> = {
  info: 'i-heroicons-information-circle',
  success: 'i-heroicons-check-circle',
  warn: 'i-heroicons-exclamation-triangle',
  error: 'i-heroicons-x-circle'
}

const formatTime = (date: Date | string) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString()
}
</script>

<template>
  <div class="flex gap-4 group">
    <!-- Timestamp Column -->
    <div class="flex flex-col items-end w-20 pt-1 shrink-0">
      <span class="text-xs font-mono text-gray-500">
        {{ formatTime(entry.createdAt) }}
      </span>
      <span class="text-[10px] text-gray-400">
        {{ formatDate(entry.createdAt) }}
      </span>
    </div>

    <!-- Timeline Line -->
    <div class="relative flex flex-col items-center shrink-0">
      <div 
        class="w-2.5 h-2.5 rounded-full border-2 bg-white z-10 transition-colors"
        :class="statusColors[entry.level]"
      ></div>
      <div class="w-px h-full bg-gray-100 group-last:hidden -mt-1"></div>
    </div>

    <!-- Content Card -->
    <div class="flex-1 pb-8">
      <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-gray-200 transition-all group-hover:shadow-md">
        <div class="flex justify-between items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <UIcon :name="statusIcons[entry.level]" class="w-4 h-4" :class="statusColors[entry.level].replace('border-', 'text-')" />
              <p class="text-sm font-semibold text-gray-900 leading-none">{{ entry.message }}</p>
            </div>
            <div class="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">
              <span>{{ entry.source }}</span>
              <span v-if="entry.ip">• {{ entry.ip }}</span>
            </div>
          </div>
          
          <UPopover v-if="entry.details">
            <UButton 
              color="neutral" 
              variant="ghost" 
              size="xs" 
              label="Details"
              icon="i-heroicons-code-bracket"
            />
            <template #content>
              <div class="p-3 max-w-sm">
                <pre class="text-[10px] font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-100">{{ JSON.stringify(JSON.parse(entry.details), null, 2) }}</pre>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </div>
  </div>
</template>

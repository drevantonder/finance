<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useLogger } from '~/composables/useLogger'
import type { LogLevel, LogEntry } from '~/types'

const { logs } = useLogger()
const isLoading = ref(false)

const filterLevel = ref<LogLevel | 'all'>('all')
const filterSource = ref<string | 'all'>('all')

const sources = computed(() => {
  const s = new Set(logs.value.map(l => l.source))
  return ['all', ...Array.from(s)]
})

const filteredLogs = computed(() => {
  return logs.value.filter(l => {
    const matchesLevel = filterLevel.value === 'all' || l.level === filterLevel.value
    const matchesSource = filterSource.value === 'all' || l.source === filterSource.value
    return matchesLevel && matchesSource
  })
})

async function fetchLogs() {
  isLoading.value = true
  try {
    const data = await $fetch('/api/logs')
    logs.value = data as unknown as LogEntry[]
  } catch (err) {
    console.error('Failed to fetch logs:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="max-w-3xl mx-auto p-6 md:p-10">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Activity Feed</h1>
        <p class="text-sm text-gray-500 mt-1">Real-time log of system events, security, and sync status.</p>
      </div>

      <div class="flex items-center gap-2">
        <USelect
          v-model="filterLevel"
          :items="['all', 'info', 'success', 'warn', 'error']"
          size="sm"
          class="w-32"
          placeholder="All Levels"
        />
        <USelect
          v-model="filterSource"
          :items="sources"
          size="sm"
          class="w-32"
          placeholder="All Sources"
        />
        <UButton
          icon="i-heroicons-arrow-path"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="isLoading"
          @click="fetchLogs"
        />
      </div>
    </div>

    <div v-if="filteredLogs.length > 0" class="relative">
      <ActivityLogEntry
        v-for="entry in filteredLogs"
        :key="entry.id"
        :entry="entry"
      />
    </div>

    <div v-else-if="!isLoading" class="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
      <UIcon name="i-heroicons-bolt" class="text-4xl text-gray-200 mb-4" />
      <p class="text-gray-400 font-medium">No activity matching your filters</p>
    </div>
    
    <div v-else class="space-y-4">
      <div v-for="i in 5" :key="i" class="h-24 bg-gray-50 animate-pulse rounded-2xl" />
    </div>
  </div>
</template>

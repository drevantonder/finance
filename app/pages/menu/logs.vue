<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import type { ActivityLog, ActivityLogType, ActivityLogLevel } from '~/types'

const filters = ref({
  type: 'all' as ActivityLogType | 'all',
  level: 'all' as ActivityLogLevel | 'all',
  limit: 100
})

const { data: logs, isLoading, refetch } = useQuery({
  queryKey: ['activity-logs', filters],
  queryFn: () => $fetch<ActivityLog[]>('/api/logs', {
    params: {
      type: filters.value.type === 'all' ? undefined : filters.value.type,
      level: filters.value.level === 'all' ? undefined : filters.value.level,
      limit: filters.value.limit
    }
  }),
  refetchInterval: 10000 // Refresh every 10s
})

const typeOptions = [
  { label: 'All Types', value: 'all' },
  { label: 'Pipeline', value: 'pipeline' },
  { label: 'Error', value: 'error' },
  { label: 'System', value: 'system' }
]

const levelOptions = [
  { label: 'All Levels', value: 'all' },
  { label: 'Info', value: 'info' },
  { label: 'Success', value: 'success' },
  { label: 'Warning', value: 'warn' },
  { label: 'Error', value: 'error' }
]
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6 pb-24 px-4">
    <!-- Header & Navigation -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-neutral-500">
        <NuxtLink to="/menu" class="hover:text-primary-600 flex items-center gap-1">
          <UIcon name="i-heroicons-chevron-left" />
          Menu
        </NuxtLink>
      </div>
      <UButton 
        color="neutral" 
        variant="ghost" 
        icon="i-heroicons-arrow-path" 
        :loading="isLoading"
        @click="() => { void refetch() }"
      />
    </div>

    <div class="space-y-2">
      <h1 class="text-2xl font-bold text-neutral-900">Activity Log</h1>
      <p class="text-sm text-neutral-500">Monitor system pipeline and errors</p>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-neutral-100 shadow-sm">
      <UFormField label="Type">
        <USelect v-model="filters.type" :items="typeOptions" class="w-full" />
      </UFormField>
      <UFormField label="Level">
        <USelect v-model="filters.level" :items="levelOptions" class="w-full" />
      </UFormField>
    </div>

    <!-- Log List -->
    <div class="relative">
      <div v-if="isLoading && !logs" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-neutral-300" />
      </div>

      <div v-else-if="logs?.length === 0" class="text-center py-12 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200">
        <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-neutral-300 mb-2" />
        <p class="text-neutral-500">No activity logs found</p>
      </div>

      <div v-else class="space-y-0">
        <ActivityLogEntry 
          v-for="entry in logs" 
          :key="entry.id" 
          :entry="entry" 
        />
      </div>
    </div>
  </div>
</template>

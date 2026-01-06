<script setup lang="ts">
import { useActivityLogsQuery } from '~/composables/queries/useActivityLogsQuery'

const { data: logs, isLoading, refetch } = useActivityLogsQuery({
  stage: 'startup',
  hours: 24
})

// Filter state
const selectedDevice = ref<string>('all')
const selectedSwStatus = ref<string>('all')
const selectedHours = ref<number>(24)
const selectedLogId = ref<string | null>(null)

// Filter options
const deviceOptions = [
  { value: 'all', label: 'All Devices' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' }
]

const swStatusOptions = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Cached (SW Active)' },
  { value: 'none', label: 'Fresh (No SW)' }
]

const hoursOptions = [
  { value: 24, label: 'Last 24h' },
  { value: 168, label: 'Last 7d' },
  { value: 720, label: 'Last 30d' }
]

// Filter logs
const filteredLogs = computed(() => {
  return (logs.value || []).filter((log) => {
    const metadata = log.metadata || {}
    const device = metadata.deviceType

    // Device filter
    if (selectedDevice.value !== 'all' && device !== selectedDevice.value) {
      return false
    }

    // SW status filter
    if (selectedSwStatus.value !== 'all') {
      const swStatus = metadata.swStatus
      if (swStatus !== selectedSwStatus.value) {
        return false
      }
    }

    return true
  })
})

// Aggregate stats
const stats = computed(() => {
  const metrics = filteredLogs.value
    .map((log) => log.metadata || {})
    .filter((m) => m.lcp || m.domComplete)

  if (metrics.length === 0) {
    return { avgLcp: 0, avgLoadTime: 0, cacheHitRate: 0, count: 0 }
  }

  const avgLcp =
    metrics.reduce((acc, m) => acc + (m.lcp || 0), 0) / metrics.length
  const avgLoadTime =
    metrics.reduce((acc, m) => acc + (m.domComplete || 0), 0) / metrics.length
  const cacheHitCount = metrics.filter(
    (m) => m.isCached === true || m.swStatus === 'active'
  ).length
  const cacheHitRate = cacheHitCount / metrics.length

  return {
    avgLcp: Math.round(avgLcp),
    avgLoadTime: Math.round(avgLoadTime),
    cacheHitRate: Math.round(cacheHitRate * 100),
    count: metrics.length
  }
})

// Get device type display
const getDeviceType = (metadata: any) => {
  const device = metadata.deviceType || 'unknown'
  return device.charAt(0).toUpperCase() + device.slice(1)
}

// Get SW status display
const getSwStatus = (metadata: any) => {
  const swStatus = metadata.swStatus
  if (swStatus === 'active') return 'Cached'
  if (swStatus === 'none') return 'Fresh'
  return 'Unknown'
}

// Format date
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleString()
}

// Refresh data when filters change
watch([selectedDevice, selectedSwStatus, selectedHours], () => {
  refetch()
})

// Selected log metadata
const selectedLog = computed(() => {
  if (!selectedLogId.value) return null
  return logs.value?.find((l) => l.id === selectedLogId.value)
})

// Prepare waterfall entries
const waterfallEntries = computed(() => {
  if (!selectedLog.value?.metadata) return []

  const metadata = selectedLog.value.metadata
  const entries: any[] = []

  // Add custom marks as milestones
  const customMarks = metadata.customMarks || {}
  Object.entries(customMarks).forEach(([name, time]) => {
    entries.push({
      name,
      startTime: Number(time),
      duration: 10,
      type: 'milestone' as const
    })
  })

  // Add component render times
  const componentRenderTimes = metadata.componentRenderTimes || {}
  Object.entries(componentRenderTimes).forEach(([name, duration]) => {
    entries.push({
      name: `Component: ${name}`,
      startTime: metadata.domComplete || 0,
      duration: Number(duration),
      type: 'component' as const
    })
  })

  // Add categorized resources
  const categorizedResources = metadata.categorizedResources || []
  categorizedResources.forEach((r: any) => {
    entries.push({
      name: r.name,
      startTime: r.startTime,
      duration: r.duration,
      type: r.type,
      cached: r.cached,
      size: r.transferSize
    })
  })

  // Sort by start time
  return entries.sort((a, b) => a.startTime - b.startTime)
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Performance Analytics</h1>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
        <div class="text-sm text-neutral-500">Avg LCP</div>
        <div class="text-2xl font-bold">{{ stats.avgLcp }}ms</div>
      </div>
      <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
        <div class="text-sm text-neutral-500">Avg Load Time</div>
        <div class="text-2xl font-bold">{{ stats.avgLoadTime }}ms</div>
      </div>
      <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
        <div class="text-sm text-neutral-500">Cache Hit Rate</div>
        <div class="text-2xl font-bold">{{ stats.cacheHitRate }}%</div>
      </div>
      <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
        <div class="text-sm text-neutral-500">Logs</div>
        <div class="text-2xl font-bold">{{ stats.count }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-4 mb-6">
      <USelect
        v-model="selectedDevice"
        :options="deviceOptions"
        placeholder="Device type"
        size="sm"
      />
      <USelect
        v-model="selectedSwStatus"
        :options="swStatusOptions"
        placeholder="SW Status"
        size="sm"
      />
      <USelect
        v-model="selectedHours"
        :options="hoursOptions"
        placeholder="Date range"
        size="sm"
      />
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- Log list -->
      <div class="bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <h2 class="text-lg font-semibold mb-4 p-4 border-b border-neutral-200 dark:border-neutral-800">
          Startup Logs ({{ filteredLogs.length }})
        </h2>
        <div
          v-if="isLoading"
          class="p-4 text-center text-neutral-500"
        >
          Loading...
        </div>
        <div v-else-if="filteredLogs.length === 0" class="p-4 text-center text-neutral-500">
          No logs found
        </div>
        <div v-else class="divide-y divide-neutral-200 dark:divide-neutral-800">
          <button
            v-for="log in filteredLogs"
            :key="log.id"
            @click="selectedLogId = log.id"
            class="w-full text-left p-4 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            :class="{ 'bg-neutral-100 dark:bg-neutral-800': selectedLogId === log.id }"
          >
            <div class="flex justify-between items-start mb-2">
              <span class="font-medium text-sm">{{ getDeviceType(log.metadata) }}</span>
              <span
                class="text-xs px-2 py-1 rounded"
                :class="log.metadata?.isCached ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'"
              >
                {{ getSwStatus(log.metadata) }}
              </span>
            </div>
            <div class="text-xs text-neutral-500">
              {{ formatDate(log.createdAt) }}
            </div>
            <div v-if="log.metadata?.lcp" class="text-xs mt-1">
              LCP: {{ Math.round(log.metadata.lcp) }}ms
            </div>
          </button>
        </div>
      </div>

      <!-- Waterfall view -->
      <div class="bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <div class="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 class="text-lg font-semibold">Waterfall</h2>
          <a
            v-if="selectedLog"
            :href="`/menu/logs`"
            target="_blank"
            class="text-sm text-blue-500 hover:underline"
          >
            View full log
          </a>
        </div>
        <div v-if="!selectedLog" class="p-4 text-center text-neutral-500">
          Select a log to view waterfall
        </div>
        <div v-else class="p-4">
          <WaterfallChart :entries="waterfallEntries" />
        </div>
      </div>
    </div>
  </div>
</template>

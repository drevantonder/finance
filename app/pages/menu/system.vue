<script setup lang="ts">
const { logs } = useLogger()
const { data: inbox } = useInboxQuery()

const stats = computed(() => [
  { label: 'Logs', value: logs.value.length, color: 'primary' },
  { label: 'Inbox Items', value: inbox.value?.filter(i => i.status !== 'complete').length || 0, color: 'warning' },
  { label: 'Sync Status', value: 'Active', color: 'success' }
])
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard v-for="stat in stats" :key="stat.label">
        <div class="text-sm text-gray-500">{{ stat.label }}</div>
        <div class="text-2xl font-bold" :class="`text-${stat.color}-600`">{{ stat.value }}</div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">Recent Logs</h3>
        </div>
      </template>
      <div class="divide-y divide-gray-100 dark:divide-gray-800">
        <ActivityLogEntry 
          v-for="log in logs.slice(0, 20)" 
          :key="log.id" 
          :entry="log" 
        />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="font-semibold">Email Inbox Health</h3>
      </template>
      <div v-if="inbox?.length" class="space-y-4">
        <div v-for="item in inbox" :key="item.id" class="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
          <div class="min-w-0 flex-1 mr-4">
            <div class="font-medium truncate">{{ item.subject }}</div>
            <div class="text-xs text-gray-500 truncate">{{ item.fromAddress }}</div>
          </div>
          <UBadge :color="item.status === 'complete' ? 'success' : 'warning'" size="xs" class="flex-shrink-0">
            {{ item.status }}
          </UBadge>
        </div>
      </div>
      <div v-else class="py-8 text-center text-gray-500 text-sm">
        No active inbox items
      </div>
    </UCard>
  </div>
</template>

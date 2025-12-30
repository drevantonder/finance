<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLogger } from '~/composables/useLogger'
import { useInboxQuery } from '~/composables/queries'

const { logs } = useLogger()
const { data: inbox } = useInboxQuery()
const { mutate: approveInbox, isPending: isApproving } = useApproveInboxMutation()
const { mutate: processInbox, isPending: isProcessing } = useProcessInboxMutation()
const { mutate: deleteInbox } = useDeleteInboxMutation()

// Enhanced stats
const inboxStats = computed(() => {
  if (!inbox.value) return { total: 0, pending: 0, complete: 0, failed: 0 }
  return {
    total: inbox.value.length,
    pending: inbox.value.filter(i => i.status === 'pending' || i.status === 'processing').length,
    complete: inbox.value.filter(i => i.status === 'complete').length,
    failed: inbox.value.filter(i => i.status === 'error').length,
    unauthorized: inbox.value.filter(i => i.status === 'unauthorized').length,
  }
})

const lastProcessed = computed(() => {
  const completed = inbox.value?.filter(i => i.status === 'complete')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return completed?.[0]?.createdAt 
    ? new Date(completed[0].createdAt).toLocaleString() 
    : 'No recent activity'
})

const recentErrors = computed(() => {
  return logs.value.filter(l => l.level === 'error').slice(0, 5)
})

// Log level filter
const logLevelFilter = ref<'all' | 'error' | 'warn' | 'info'>('all')
const filteredLogs = computed(() => {
  if (logLevelFilter.value === 'all') return logs.value.slice(0, 20)
  return logs.value.filter(l => l.level === logLevelFilter.value).slice(0, 20)
})

const stats = computed(() => [
  { label: 'System Logs', value: logs.value.length, color: 'primary', icon: 'i-heroicons-list-bullet' },
  { label: 'Inbox Status', value: inboxStats.value.pending > 0 ? 'Action Needed' : 'Healthy', color: inboxStats.value.pending > 0 ? 'warning' : 'success', icon: 'i-heroicons-inbox' },
  { label: 'Last Sync', value: lastProcessed.value, color: 'neutral', icon: 'i-heroicons-arrow-path' }
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">System Health</h1>
      <SyncIndicator />
    </div>

    <!-- Pipeline Health -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <UCard>
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Receipts</div>
        <div class="text-2xl font-black text-gray-900 dark:text-white">{{ inboxStats.total }}</div>
      </UCard>
      <UCard>
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pending</div>
        <div class="text-2xl font-black text-warning-500">{{ inboxStats.pending }}</div>
      </UCard>
      <UCard>
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Processed</div>
        <div class="text-2xl font-black text-success-500">{{ inboxStats.complete }}</div>
      </UCard>
      <UCard>
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Failed</div>
        <div class="text-2xl font-black text-error-500">{{ inboxStats.failed }}</div>
      </UCard>
      <UCard>
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Unauthorized</div>
        <div class="text-2xl font-black text-orange-500">{{ inboxStats.unauthorized }}</div>
      </UCard>
    </div>

    <!-- Error Alerts -->
    <UCard v-if="recentErrors.length > 0" class="border-error-200 dark:border-error-900 bg-error-50 dark:bg-error-950/30">
      <template #header>
        <div class="flex items-center gap-2 text-error-700 dark:text-error-400">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
          <span class="font-bold">Recent System Errors</span>
        </div>
      </template>
      <div class="space-y-1">
        <ActivityLogEntry v-for="log in recentErrors" :key="log.id" :entry="log" />
      </div>
    </UCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Activity Logs -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold">Activity Logs</h3>
            <div class="flex gap-1">
              <UButton 
                v-for="level in ['all', 'error', 'warn']" 
                :key="level"
                :label="level"
                :variant="logLevelFilter === level ? 'solid' : 'ghost'"
                color="neutral"
                size="xs"
                class="capitalize"
                @click="logLevelFilter = level as any"
              />
            </div>
          </div>
        </template>
        <div class="divide-y divide-gray-100 dark:divide-gray-800 -mx-4 -my-2 px-4">
          <div v-if="filteredLogs.length === 0" class="py-10 text-center text-gray-500 text-sm">
            No logs match current filter
          </div>
          <ActivityLogEntry v-for="log in filteredLogs" :key="log.id" :entry="log" />
        </div>
      </UCard>

      <!-- Email Inbox -->
      <UCard>
        <template #header>
          <h3 class="font-bold">Email Inbox Health</h3>
        </template>
        <div v-if="inbox?.length" class="space-y-3">
        <div v-for="item in inbox.slice(0, 15)" :key="item.id" class="flex items-center justify-between text-sm p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
          <div class="min-w-0 flex-1 mr-4">
            <div class="font-bold text-gray-900 dark:text-white truncate">{{ item.subject }}</div>
            <div class="text-xs text-gray-500 truncate">From: {{ item.fromAddress }}</div>
          </div>
          <div class="flex items-center gap-2">
            <!-- Action buttons for unauthorized/error items -->
            <UButton
              v-if="item.status === 'unauthorized'"
              icon="i-heroicons-check"
              size="xs"
              color="success"
              variant="soft"
              :loading="isApproving"
              @click="approveInbox(item.id)"
            >
              Approve
            </UButton>
            <UButton
              v-if="item.status === 'error'"
              icon="i-heroicons-arrow-path"
              size="xs"
              color="warning"
              variant="soft"
              :loading="isProcessing"
              @click="processInbox(item.id)"
            >
              Retry
            </UButton>
            <UButton
              v-if="item.status === 'complete'"
              icon="i-heroicons-arrow-path"
              size="xs"
              color="neutral"
              variant="ghost"
              :loading="isProcessing"
              @click="processInbox(item.id)"
              title="Re-extract data from this receipt"
            >
              Reprocess
            </UButton>
            <UButton
              v-if="item.status === 'unauthorized' || item.status === 'error'"
              icon="i-heroicons-trash"
              size="xs"
              color="error"
              variant="ghost"
              @click="deleteInbox(item.id)"
            />
            <UBadge 
              :color="item.status === 'complete' ? 'success' : (item.status === 'error' ? 'error' : (item.status === 'unauthorized' ? 'warning' : 'neutral'))" 
              size="xs" 
              variant="subtle"
              class="flex-shrink-0 font-bold capitalize"
            >
              {{ item.status }}
            </UBadge>
          </div>
        </div>
          <div v-if="inbox.length > 15" class="pt-2 text-center text-xs text-gray-400">
            Showing latest 15 of {{ inbox.length }} items
          </div>
        </div>
        <div v-else class="py-12 text-center text-gray-500 text-sm italic">
          <UIcon name="i-heroicons-inbox" class="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p>No active inbox items</p>
        </div>
      </UCard>
    </div>
  </div>
</template>

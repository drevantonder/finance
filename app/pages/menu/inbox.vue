<script setup lang="ts">
import { computed } from 'vue'
import { useInboxQuery } from '~/composables/queries'

const { data: inbox } = useInboxQuery()
const { mutate: approveInbox, isPending: isApproving } = useApproveInboxMutation()
const { mutate: processInbox, isPending: isProcessing } = useProcessInboxMutation()
const { mutate: deleteInbox } = useDeleteInboxMutation()

const inboxStats = computed(() => {
  if (!inbox.value) return { total: 0, pending: 0, complete: 0, failed: 0, unauthorized: 0 }
  return {
    total: inbox.value.length,
    pending: inbox.value.filter(i => i.status === 'pending' || i.status === 'processing').length,
    complete: inbox.value.filter(i => i.status === 'complete').length,
    failed: inbox.value.filter(i => i.status === 'error').length,
    unauthorized: inbox.value.filter(i => i.status === 'unauthorized').length,
  }
})
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
    </div>

    <div class="space-y-2">
      <h1 class="text-2xl font-bold text-neutral-900">Email Inbox</h1>
      <p class="text-sm text-neutral-500">Manage receipts received via email</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard class="text-center">
        <div class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Pending</div>
        <div class="text-xl font-black text-warning-500">{{ inboxStats.pending }}</div>
      </UCard>
      <UCard class="text-center">
        <div class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Processed</div>
        <div class="text-xl font-black text-success-500">{{ inboxStats.complete }}</div>
      </UCard>
      <UCard class="text-center">
        <div class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Failed</div>
        <div class="text-xl font-black text-error-500">{{ inboxStats.failed }}</div>
      </UCard>
      <UCard class="text-center">
        <div class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Blocked</div>
        <div class="text-xl font-black text-orange-500">{{ inboxStats.unauthorized }}</div>
      </UCard>
    </div>

    <!-- Inbox List -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-bold">Recent Items</h3>
          <SyncIndicator />
        </div>
      </template>

      <div v-if="inbox?.length" class="space-y-3">
        <div v-for="item in inbox" :key="item.id" class="text-sm p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
          <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1 mr-4">
              <div class="font-bold text-neutral-900 dark:text-white truncate">{{ item.subject }}</div>
              <div class="text-xs text-neutral-500 truncate">From: {{ item.fromAddress }}</div>
            </div>
            <div class="flex items-center gap-2">
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
                title="Re-extract data"
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
          <!-- Attachments -->
          <div class="mt-2 flex items-center gap-2 flex-wrap">
            <template v-if="(item.attachments?.length ?? 0) > 0">
              <div 
                v-for="att in item.attachments" 
                :key="att.id"
                class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                :class="att.blobExists ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700'"
              >
                <UIcon :name="att.mimeType === 'application/pdf' ? 'i-heroicons-document' : 'i-heroicons-photo'" class="w-3 h-3" />
                <span class="truncate max-w-24">{{ att.filename || 'unnamed' }}</span>
              </div>
            </template>
            <div v-else class="text-[10px] text-neutral-400 italic">No attachments</div>
          </div>
        </div>
      </div>
      <div v-else class="py-12 text-center text-neutral-500 text-sm italic">
        <UIcon name="i-heroicons-inbox" class="w-10 h-10 mx-auto mb-2 opacity-20" />
        <p>No inbox items</p>
      </div>
    </UCard>
  </div>
</template>

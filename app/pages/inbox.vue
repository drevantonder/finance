<script setup lang="ts">
import { useInboxQuery, useProcessInboxMutation, useApproveInboxMutation } from '~/composables/queries'

const { data: items = [], status, refresh } = useInboxQuery()
const pending = computed(() => status.value === 'pending')
const { mutateAsync: processItemMutation } = useProcessInboxMutation()
const { mutateAsync: approveItemMutation } = useApproveInboxMutation()

const toast = useToast()
const processing = ref<Record<string, boolean>>({})

async function processItem(id: string) {
  processing.value[id] = true
  try {
    await processItemMutation(id)
    toast.add({ title: 'Expense created successfully', color: 'success' })
  } catch (err: any) {
    toast.add({ 
      title: 'Processing failed', 
      description: err.statusMessage || 'Check logs for details',
      color: 'error' 
    })
  } finally {
    processing.value[id] = false
  }
}

async function approveItem(id: string) {
  processing.value[id] = true
  try {
    await approveItemMutation(id)
    toast.add({ title: 'Item approved and processed', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Approval failed', color: 'error' })
  } finally {
    processing.value[id] = false
  }
}

const sortedItems = computed(() => {
  if (!items.value) return []
  return [...items.value].sort((a, b) => 
    new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  )
})

function getStatusColor(status: string) {
  switch (status) {
    case 'complete': return 'success'
    case 'processing': return 'info'
    case 'error': return 'error'
    case 'unauthorized': return 'warning'
    default: return 'neutral'
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Household Inbox</h1>
        <p class="text-gray-500">Forward receipts to <code class="bg-gray-100 px-1 rounded text-primary-700 font-medium">finance@thevantonders.com</code></p>
      </div>

      <UButton
        icon="i-heroicons-arrow-path"
        color="neutral"
        variant="ghost"
        :loading="pending"
        @click="refresh"
      >
        Refresh
      </UButton>
    </div>

    <UCard p-0 overflow-hidden>
      <div v-if="!items?.length && !pending" class="p-12 text-center">
        <UIcon name="i-heroicons-envelope" class="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p class="text-gray-500 font-medium">Inbox is empty</p>
        <p class="text-gray-400 text-sm mt-1">Forward receipts from your authorized Gmail to see them here.</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div 
          v-for="item in sortedItems" 
          :key="item.id"
          class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
        >
          <div class="flex items-start gap-4 min-w-0">
            <div class="mt-1">
              <UIcon 
                :name="item.verified ? 'i-heroicons-envelope' : 'i-heroicons-exclamation-triangle'" 
                class="h-5 w-5"
                :class="item.verified ? 'text-primary-500' : 'text-amber-500'"
              />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-900 truncate">{{ item.subject }}</span>
                <UBadge :color="getStatusColor(item.status)" variant="subtle" size="xs" class="capitalize">
                  {{ item.status }}
                </UBadge>
              </div>
              <div class="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                <span class="truncate">From: {{ item.fromAddress }}</span>
                <span>&bull;</span>
                <span>{{ new Date(item.receivedAt).toLocaleString() }}</span>
              </div>
              <div v-if="item.attachments?.length" class="flex gap-2 mt-2">
                <div 
                  v-for="att in item.attachments" 
                  :key="att.id"
                  class="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                >
                  <UIcon :name="att.mimeType === 'application/pdf' ? 'i-heroicons-document-text' : 'i-heroicons-photo'" />
                  {{ att.filename }}
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              v-if="item.status === 'unauthorized'"
              size="xs"
              color="success"
              variant="subtle"
              icon="i-heroicons-check-badge"
              :loading="processing[item.id]"
              @click="approveItem(item.id)"
            >
              Approve & Process
            </UButton>
            <UButton
              v-if="item.status === 'pending' || item.status === 'error'"
              size="xs"
              color="primary"
              variant="solid"
              :loading="processing[item.id]"
              @click="processItem(item.id)"
            >
              Process
            </UButton>
            <UButton
              v-if="item.expenseId"
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-eye"
              :to="'/expenses?id=' + item.expenseId"
            >
              View Expense
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
    
    <!-- Setup Instructions -->
    <UCard class="bg-blue-50 border-blue-100">
      <div class="flex gap-3">
        <UIcon name="i-heroicons-information-circle" class="h-5 w-5 text-blue-500 shrink-0" />
        <div class="text-sm text-blue-800">
          <p class="font-bold mb-1 text-blue-900">How to use your Household Inbox:</p>
          <ol class="list-decimal ml-4 space-y-1">
            <li>Configure Cloudflare Email Routing to send mail to this application worker.</li>
            <li>Add a filter in your Gmail to auto-forward receipts to your custom domain address.</li>
            <li>Only emails forwarded from your <strong>Authorized Users</strong> accounts will be automatically verified and processed.</li>
          </ol>
        </div>
      </div>
    </UCard>
  </div>
</template>

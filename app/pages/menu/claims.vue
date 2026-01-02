<script setup lang="ts">
import { ref, computed } from 'vue'
import { useExpenseClaimsQuery, useBulkExpenseClaimMutation, useExpenseClaimMutation } from '~/composables/queries'
import { PTC_CATEGORIES } from '~/utils/ptcCategories'
import { formatCurrency } from '~/composables/useFormatter'

const { data: unclaimedRows, isLoading } = useExpenseClaimsQuery('pending')
const { mutateAsync: bulkAction } = useBulkExpenseClaimMutation()
const { mutateAsync: updateClaim } = useExpenseClaimMutation()

// Sort by oldest first (most urgent - closest to 12mo expiry)
const sortedRows = computed(() => {
  if (!unclaimedRows.value) return []
  return [...unclaimedRows.value].sort((a, b) => {
    const dateA = new Date(a.expense.date || a.expense.capturedAt).getTime()
    const dateB = new Date(b.expense.date || b.expense.capturedAt).getTime()
    return dateA - dateB // oldest first
  })
})

// Selection - track by expense ID since expense_claim may not exist yet
const selectedExpenseIds = ref<Set<string>>(new Set())
const isAllSelected = computed(() => 
  (sortedRows.value?.length || 0) > 0 && selectedExpenseIds.value.size === sortedRows.value?.length
)

function toggleAll() {
  if (isAllSelected.value) selectedExpenseIds.value = new Set()
  else selectedExpenseIds.value = new Set(sortedRows.value?.map(r => r.expense.id))
}

function toggleSelect(expenseId: string) {
  const newSet = new Set(selectedExpenseIds.value)
  if (newSet.has(expenseId)) newSet.delete(expenseId)
  else newSet.add(expenseId)
  selectedExpenseIds.value = newSet
}

// Archive
async function archiveSelected() {
  const expenseIds = Array.from(selectedExpenseIds.value)
  if (!expenseIds.length) return
  
  await bulkAction({ expenseIds, action: 'archive' })
  selectedExpenseIds.value = new Set()
}

// Stats
const totalUnclaimed = computed(() => 
  unclaimedRows.value?.reduce((sum, r) => sum + (r.expense.total || 0), 0) || 0
)

const daysLeft = (date: string | Date) => {
  const expiry = new Date(date)
  expiry.setFullYear(expiry.getFullYear() + 1)
  const diff = expiry.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const getUrgencyColor = (days: number) => {
  if (days < 0) return 'text-gray-400 line-through'
  if (days < 30) return 'text-error-500'
  if (days < 60) return 'text-warning-500'
  return 'text-success-500'
}

// Focus Mode / Assistant
const isAssistantOpen = ref(false)
const selectedForClaim = computed(() => 
  sortedRows.value?.filter(r => selectedExpenseIds.value.has(r.expense.id)) || []
)

function startClaim() {
  if (selectedExpenseIds.value.size === 0) return
  isAssistantOpen.value = true
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8 pb-24 px-4">
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Claims</h1>
        <p class="text-sm text-gray-500">Manage your P2C MMR/MFB claims and track expenses.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <UButton 
          icon="i-heroicons-archive-box" 
          color="neutral" 
          variant="subtle"
          label="Archived" 
        />
        <UButton 
          icon="i-heroicons-clock" 
          color="neutral" 
          variant="subtle"
          label="History" 
        />
        <UButton 
          icon="i-heroicons-play" 
          color="primary" 
          label="Start Claim" 
          :disabled="selectedExpenseIds.size === 0"
          @click="startClaim"
        />
      </div>
    </header>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">To Claim</span>
          <span class="text-2xl font-bold text-gray-900">{{ formatCurrency(totalUnclaimed) }}</span>
          <span class="text-xs text-gray-500 mt-1">{{ sortedRows?.length || 0 }} expenses pending</span>
        </div>
      </UCard>
      
      <UCard>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">MFB Budget</span>
          <div class="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-primary-500" style="width: 65%"></div>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-xs font-medium text-gray-500">$7,235 claimed</span>
            <span class="text-xs font-medium text-gray-900">$2,716 left</span>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Financial Year</span>
          <span class="text-xl font-bold text-gray-900 mt-1">2025-26</span>
          <span class="text-xs text-gray-500 mt-1">Ends Mar 31, 2026</span>
        </div>
      </UCard>
    </div>

    <!-- Triage List -->
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h3 class="font-bold text-gray-900">Unclaimed Expenses</h3>
            <div v-if="selectedExpenseIds.size > 0" class="flex items-center gap-2">
              <span class="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                {{ selectedExpenseIds.size }} selected
              </span>
              <UButton 
                size="xs" 
                color="neutral" 
                variant="ghost" 
                label="Archive" 
                icon="i-heroicons-archive-box"
                @click="archiveSelected"
              />
            </div>
          </div>
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="p-4 w-10">
                <UCheckbox :model-value="isAllSelected" @update:model-value="toggleAll" />
              </th>
              <th class="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expense</th>
              <th class="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">P2C Category</th>
              <th class="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-24 text-center">MFB %</th>
              <th class="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
              <th class="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Expiry</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="isLoading">
              <td colspan="6" class="p-8 text-center">
                <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin text-gray-400 mx-auto" />
              </td>
            </tr>
            <tr 
              v-else
              v-for="row in sortedRows" 
              :key="row.expense.id"
              class="hover:bg-gray-50/50 transition-colors"
              :class="{ 
                'bg-primary-50/20': selectedExpenseIds.has(row.expense.id),
                'opacity-50': daysLeft(row.expense.date || row.expense.capturedAt) < 0
              }"
            >
              <td class="p-4">
                <UCheckbox 
                  :model-value="selectedExpenseIds.has(row.expense.id)" 
                  @update:model-value="toggleSelect(row.expense.id)" 
                />
              </td>
              <td class="p-4">
                <div class="flex flex-col">
                  <span class="text-sm font-semibold text-gray-900">{{ row.expense.merchant || 'Unknown' }}</span>
                  <span class="text-xs text-gray-500">{{ new Date(row.expense.date || row.expense.capturedAt).toLocaleDateString('en-AU') }}</span>
                </div>
              </td>
              <td class="p-4">
                <div v-if="row.ptcCategory" class="text-xs font-medium text-gray-700">
                  {{ row.ptcCategory }}
                </div>
                <div v-else class="flex items-center gap-1 text-xs font-bold text-warning-600 uppercase tracking-tight">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-3.5 h-3.5" />
                  Not Linked
                </div>
              </td>
              <td class="p-4 text-center">
                <span 
                  class="text-xs font-bold px-2 py-1 rounded"
                  :class="{
                    'bg-success-50 text-success-700': (row.mfbPercent ?? 100) === 100,
                    'bg-warning-50 text-warning-700': (row.mfbPercent ?? 100) > 0 && (row.mfbPercent ?? 100) < 100,
                    'bg-gray-100 text-gray-500': (row.mfbPercent ?? 100) === 0
                  }"
                >
                  {{ row.mfbPercent ?? 100 }}%
                </span>
              </td>
              <td class="p-4 text-right">
                <span class="text-sm font-bold text-gray-900">{{ formatCurrency(row.expense.total) }}</span>
              </td>
              <td class="p-4 text-right">
                <div class="flex flex-col items-end">
                  <span class="text-xs font-bold" :class="getUrgencyColor(daysLeft(row.expense.date || row.expense.capturedAt))">
                    <template v-if="daysLeft(row.expense.date || row.expense.capturedAt) < 0">
                      Expired
                    </template>
                    <template v-else>
                      {{ daysLeft(row.expense.date || row.expense.capturedAt) }} days
                    </template>
                  </span>
                  <span class="text-[10px] text-gray-400">until 12mo limit</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="!isLoading && (!sortedRows || sortedRows.length === 0)" class="p-12 text-center text-gray-500 italic">
        No pending expenses found.
      </div>
    </UCard>

    <!-- Claim Assistant Modal (Placeholder for now) -->
    <UModal v-model:open="isAssistantOpen" title="Claim Assistant" fullscreen>
      <template #body>
        <div class="flex-1 flex gap-8 overflow-hidden h-full">
          <!-- Queue -->
          <div class="w-64 flex flex-col gap-3 overflow-y-auto">
             <div 
              v-for="(row, idx) in selectedForClaim" 
              :key="row.expense.id"
              class="p-4 rounded-xl border border-gray-100 bg-white shadow-sm"
              :class="{ 'ring-2 ring-primary-500': idx === 0 }"
            >
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{{ idx + 1 }}. {{ row.expense.merchant }}</div>
              <div class="text-sm font-bold">{{ formatCurrency(row.expense.total) }}</div>
            </div>
          </div>
          
          <!-- Assistant Body (Focus Area) -->
          <div class="flex-1 bg-gray-50 rounded-2xl p-8 flex flex-col items-center justify-center border border-gray-100">
            <div class="text-center max-w-sm">
              <UIcon name="i-heroicons-rocket-launch" class="text-5xl text-primary-500 mb-4" />
              <h3 class="text-lg font-bold text-gray-900">Focus Mode</h3>
              <p class="text-sm text-gray-500 mt-2">The full Copy-Paste assistant is coming in the next step. For now, you can select and view your claimable items.</p>
              <UButton class="mt-6" @click="isAssistantOpen = false">Close Assistant</UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useExpensesQuery, useExpenseMutation, useDeleteExpenseMutation } from '~/composables/queries'
import { useCategoriesQuery } from '~/composables/queries'
import { formatCurrency } from '~/composables/useFormatter'
import type { Expense } from '~/types'

const { data: expenses, isLoading, error } = useExpensesQuery()
const { mutateAsync: updateExpense } = useExpenseMutation()
const { mutateAsync: deleteExpense } = useDeleteExpenseMutation()

const { data: categories } = useCategoriesQuery()
const getCategoryColor = (name: string) => categories.value?.find((c: any) => c.name === name)?.color || '#9ca3af'

const toast = useToast()

// Sorting
const sortOption = ref('invoice-date-desc')
const sortOptions = [
  { label: 'Invoice Date (Newest)', value: 'invoice-date-desc' },
  { label: 'Invoice Date (Oldest)', value: 'invoice-date-asc' },
  { label: 'Capture Date (Newest)', value: 'capture-date-desc' },
  { label: 'Capture Date (Oldest)', value: 'capture-date-asc' },
  { label: 'Processed Date (Newest)', value: 'processed-date-desc' },
  { label: 'Processed Date (Oldest)', value: 'processed-date-asc' },
]

const sortedExpenses = computed(() => {
  if (!expenses.value) return []
  return [...expenses.value].sort((a, b) => {

    switch (sortOption.value) {
      case 'invoice-date-asc':
        return new Date(a.date || a.capturedAt || 0).getTime() - new Date(b.date || b.capturedAt || 0).getTime()
      case 'capture-date-desc':
        return new Date(b.capturedAt || 0).getTime() - new Date(a.capturedAt || 0).getTime()
      case 'capture-date-asc':
        return new Date(a.capturedAt || 0).getTime() - new Date(b.capturedAt || 0).getTime()
      case 'processed-date-desc':
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      case 'processed-date-asc':
        return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
      case 'invoice-date-desc':
      default:
        return new Date(b.date || b.capturedAt || 0).getTime() - new Date(a.date || a.capturedAt || 0).getTime()
    }
  })
})

// Selection State
const selectedId = ref<string | null>(null)
const selectedExpense = computed(() => 
  expenses.value?.find(e => e.id === selectedId.value) || null
)
const isDetailOpen = computed(() => !!selectedId.value)

const checkedIds = ref<Set<string>>(new Set())
const lastCheckedId = ref<string | null>(null)

const isSelectionMode = computed(() => checkedIds.value.size > 0)
const isAllSelected = computed(() => 
  (expenses.value?.length || 0) > 0 && checkedIds.value.size === (expenses.value?.length || 0)
)
const isIndeterminate = computed(() => 
  checkedIds.value.size > 0 && checkedIds.value.size < (expenses.value?.length || 0)
)

function toggleCheck(id: string, event?: MouseEvent) {
  const newChecked = new Set(checkedIds.value)
  
  if (event?.shiftKey && lastCheckedId.value && expenses.value) {
    const allIds = (sortedExpenses.value as Expense[]).map(e => e.id)
    const start = allIds.indexOf(lastCheckedId.value)
    const end = allIds.indexOf(id)
    const range = allIds.slice(Math.min(start, end), Math.max(start, end) + 1)
    
    const shouldAdd = !newChecked.has(id)
    range.forEach(rangeId => {
      if (shouldAdd) newChecked.add(rangeId)
      else newChecked.delete(rangeId)
    })
  } else {
    if (newChecked.has(id)) newChecked.delete(id)
    else newChecked.add(id)
  }
  
  checkedIds.value = newChecked
  lastCheckedId.value = id
}

function toggleAll() {
  if (isAllSelected.value) {
    checkedIds.value = new Set()
  } else {
    checkedIds.value = new Set(expenses.value?.map(e => e.id) || [])
  }
}

function clearSelection() {
  checkedIds.value = new Set()
  lastCheckedId.value = null
}

// Processing Tracking
const pendingUploads = ref(0)
const processingCount = computed(() => 
  pendingUploads.value + (expenses.value?.filter(e => e.status === 'processing' || e.status === 'pending').length || 0)
)

// Actions
function selectExpense(expense: Expense) {
  selectedId.value = expense.id
}

function closeDetail() {
  selectedId.value = null
}

async function handleCaptured(data: { image: string, capturedAt: string, imageHash: string }) {
  const { image, capturedAt, imageHash } = data
  pendingUploads.value++
  try {
    const newExpense = await $fetch<Expense>('/api/expenses', {
      method: 'POST',
      body: { image, capturedAt, imageHash }
    })
    // Only select if it's the only one (avoids jumping around during bulk upload)
    if (pendingUploads.value === 1) {
      selectExpense(newExpense)
    }
  } catch (err) {
    toast.add({ title: 'Upload failed', color: 'error' })
  } finally {
    pendingUploads.value--
  }
}

async function handleUpdate(updates: Partial<Expense>) {
  if (!selectedId.value) return
  await updateExpense({ id: selectedId.value, ...updates })
}

async function handleDelete() {
  if (!selectedId.value) return
  if (confirm('Are you sure you want to delete this expense?')) {
    await deleteExpense(selectedId.value)
    closeDetail()
  }
}

async function bulkDelete() {
  const ids = Array.from(checkedIds.value)
  if (ids.length === 0) return
  
  try {
    await Promise.all(ids.map(id => deleteExpense(id)))
    toast.add({ title: `Deleted ${ids.length} expenses`, color: 'success' })
    clearSelection()
    if (ids.includes(selectedId.value || '')) {
      closeDetail()
    }
  } catch (err) {
    toast.add({ title: 'Bulk delete failed', color: 'error' })
  }
}

async function bulkReprocess() {
  const ids = Array.from(checkedIds.value)
  if (ids.length === 0) return
  
  try {
    await Promise.all(ids.map(id => $fetch(`/api/expenses/${id}/process`, { method: 'POST' })))
    toast.add({ title: `Reprocessed ${ids.length} expenses`, color: 'success' })
    clearSelection()
  } catch (err) {
    toast.add({ title: 'Bulk reprocessing failed', color: 'error' })
  }
}

async function handleReprocess() {
  if (!selectedId.value) return
  try {
    const updated = await $fetch<Expense>(`/api/expenses/${selectedId.value}/process`, { method: 'POST' })
    if (updated) {
      toast.add({
        title: 'Reprocessing complete',
        description: `Successfully updated ${updated.merchant || 'receipt'}`,
        color: 'success'
      })
    }
  } catch (err) {
    toast.add({
      title: 'Reprocessing failed',
      description: 'Check activity log for details',
      color: 'error'
    })
  }
}

function isDuplicate(expense: Expense) {
  if (!expense.receiptHash || !expenses.value) return false
  
  // Find all expenses with this hash
  const matching = expenses.value.filter(e => e.receiptHash === expense.receiptHash)
  if (matching.length < 2) return false

  // Sort by capturedAt, keep oldest as primary
  matching.sort((a, b) => new Date(a.capturedAt || 0).getTime() - new Date(b.capturedAt || 0).getTime())
  
  // If this isn't the first one, it's a duplicate
  const first = matching[0]
  return first ? first.id !== expense.id : false
}

function selectAllDuplicates() {
  if (!expenses.value) return
  
  const duplicateIds = expenses.value
    .filter(e => isDuplicate(e))
    .map(e => e.id)

  if (duplicateIds.length === 0) {
    toast.add({ title: 'No duplicates found', color: 'info' })
    return
  }

  checkedIds.value = new Set(duplicateIds)
  toast.add({ 
    title: `Selected ${duplicateIds.length} duplicate${duplicateIds.length !== 1 ? 's' : ''}`, 
    color: 'success' 
  })
}
</script>

<template>
  <div class="absolute inset-0 flex flex-col md:flex-row bg-white overflow-hidden">
    
    <!-- Left Pane: Expense List -->
    <div 
      class="flex flex-col border-r border-gray-200 transition-all duration-300 ease-in-out bg-white z-10"
      :class="[
        isDetailOpen ? 'w-full md:w-[380px] shrink-0 absolute inset-0 md:relative' : 'w-full max-w-4xl mx-auto border-x border-gray-100',
        // Hide list on mobile when detail is open
        isDetailOpen ? 'hidden md:flex' : 'flex h-full' 
      ]"
    >
      <!-- Header -->
      <ExpensesExpenseHeader
        :count="expenses?.length || 0"
        :processing-count="processingCount"
        :sort-option="sortOption"
        :sort-options="sortOptions"
        :is-all-selected="isAllSelected"
        :is-indeterminate="isIndeterminate"
        :is-selection-mode="isSelectionMode"
        @update:sort-option="val => sortOption = val"
        @toggle-all="toggleAll"
      >
        <template #add-button>
          <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 hover:bg-primary-200 transition-colors">
            <UIcon name="i-heroicons-plus" class="w-5 h-5" />
          </div>
        </template>
      </ExpensesExpenseHeader>

      <!-- Loading State -->
      <div v-if="isLoading && (expenses?.length || 0) === 0" class="p-8 text-center">
        <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin text-gray-400 mx-auto mb-2" />
        <p class="text-sm text-gray-500">Loading expenses...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="(expenses?.length || 0) === 0" class="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-receipt-refund" class="text-2xl text-gray-400" />
        </div>
        <h3 class="font-medium text-gray-900 mb-1">No receipts yet</h3>
        <p class="text-sm max-w-[200px]">Upload a receipt to start tracking your expenses.</p>
      </div>

      <!-- List -->
      <div v-else class="flex-1 overflow-y-auto divide-y divide-gray-50 pb-20 md:pb-0">
        <ExpensesExpenseListItem
          v-for="expense in sortedExpenses"
          :key="expense.id"
          :expense="(expense as any)"
          :is-selected="selectedId === expense.id"
          :is-duplicate="isDuplicate(expense)"
          :is-checked="checkedIds.has(expense.id)"
          :is-selection-mode="isSelectionMode"
          @toggle="toggleCheck(expense.id, $event)"
          @click="isSelectionMode || $event.shiftKey ? toggleCheck(expense.id, $event) : selectExpense(expense)"
        />
      </div>

      <!-- Bulk Actions -->
      <ExpensesExpenseBulkActionBar
        v-if="isSelectionMode"
        :selected-count="checkedIds.size"
        @clear="clearSelection"
        @delete="bulkDelete"
        @reprocess="bulkReprocess"
        @select-duplicates="selectAllDuplicates"
      />
    </div>

    <!-- Right Pane: Detail Editor (Mailbox View) -->
    <div 
      v-if="selectedExpense"
      class="flex-1 flex flex-col min-w-0 bg-white transition-all duration-300"
      :class="[
        // Mobile: Fixed overlay
        'fixed inset-0 z-50 md:static md:z-auto',
      ]"
    >
      <ExpenseEditor
        :expense="selectedExpense"
        @update="handleUpdate"
        @delete="handleDelete"
        @reprocess="handleReprocess"
        @close="closeDetail"
      />
    </div>

    <!-- Empty Detail State (Desktop only) -->
    <div 
      v-else-if="(expenses?.length || 0) > 0"
      class="hidden md:flex flex-1 items-center justify-center bg-gray-50/50"
    >
      <div class="text-center">
        <div class="w-16 h-16 bg-white shadow-sm ring-1 ring-gray-900/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="text-2xl text-gray-400" />
        </div>
        <h3 class="text-sm font-semibold text-gray-900">Select an expense</h3>
        <p class="text-sm text-gray-500 mt-1">View details, edit line items, or verify receipts.</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Hide scrollbar for clean look in list */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 20px;
}
.overflow-y-auto:hover::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
}
</style>
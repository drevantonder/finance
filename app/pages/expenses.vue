<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useExpenses } from '~/composables/useExpenses'
import { useCategories } from '~/composables/useCategories'
import { formatCurrency } from '~/composables/useFormatter'
import type { Expense } from '~/types'

const {
  expenses,
  isLoading,
  error,
  fetchExpenses,
  uploadReceipt,
  updateExpense,
  deleteExpense,
  processExpense,
  isProcessing
} = useExpenses()

const { getCategoryColor, fetchCategories } = useCategories()

const toast = useToast()

onMounted(() => {
  fetchExpenses()
  fetchCategories()
})

// Selection State
const selectedId = ref<string | null>(null)
const selectedExpense = computed(() => 
  expenses.value.find(e => e.id === selectedId.value) || null
)

// Computed Layout
const isDetailOpen = computed(() => !!selectedId.value)

// Sorting
type SortOption = 'invoice-date-desc' | 'invoice-date-asc' | 'capture-date-desc' | 'capture-date-asc' | 'processed-date-desc' | 'processed-date-asc'
const sortOption = ref<SortOption>('invoice-date-desc')

const sortOptions = [
  { label: 'Invoice Date: Newest', value: 'invoice-date-desc' as const },
  { label: 'Invoice Date: Oldest', value: 'invoice-date-asc' as const },
  { label: 'Photo Date: Newest', value: 'capture-date-desc' as const },
  { label: 'Photo Date: Oldest', value: 'capture-date-asc' as const },
  { label: 'Processed Date: Newest', value: 'processed-date-desc' as const },
  { label: 'Processed Date: Oldest', value: 'processed-date-asc' as const }
]

const currentSortLabel = computed(() => 
  sortOptions.find(opt => opt.value === sortOption.value)?.label || 'Invoice Date: Newest'
)

const sortedExpenses = computed(() => {
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

// Processing Tracking
const pendingUploads = ref(0)
const processingCount = computed(() => 
  pendingUploads.value + expenses.value.filter(e => e.status === 'processing' || e.status === 'pending').length
)

// Actions
function selectExpense(expense: Expense) {
  selectedId.value = expense.id
}

function closeDetail() {
  selectedId.value = null
}

async function handleCaptured({ image, capturedAt, imageHash }: { image: string, capturedAt: string, imageHash: string }) {
  pendingUploads.value++
  try {
    const newExpense = await uploadReceipt(image, capturedAt, imageHash)
    // Only select if it's the only one (avoids jumping around during bulk upload)
    if (pendingUploads.value === 1) {
      selectExpense(newExpense)
    }
  } catch (err) {
    // Error handled in composable
  } finally {
    pendingUploads.value--
  }
}

async function handleUpdate(updates: Partial<Expense>) {
  if (!selectedId.value) return
  await updateExpense(selectedId.value, updates)
}

async function handleDelete() {
  if (!selectedId.value) return
  if (confirm('Are you sure you want to delete this expense?')) {
    await deleteExpense(selectedId.value)
    closeDetail()
  }
}

async function handleReprocess() {
  if (!selectedId.value) return
  try {
    const updated = await processExpense(selectedId.value)
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

// Helpers
const CURRENT_SCHEMA_VERSION = 3


function isDuplicate(expense: Expense) {
  if (!expense.receiptHash) return false
  return expenses.value.some(e => e.id !== expense.id && e.receiptHash === expense.receiptHash)
}
</script>

<template>
  <div class="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-white overflow-hidden">
    
    <!-- Left Pane: Expense List -->
    <div 
      class="flex flex-col border-r border-gray-200 transition-all duration-300 ease-in-out bg-white z-10"
      :class="[
        isDetailOpen ? 'w-full md:w-[380px] shrink-0 absolute inset-0 md:relative' : 'w-full max-w-4xl mx-auto border-x border-gray-100',
        // Hide list on mobile when detail is open
        isDetailOpen ? 'hidden md:flex' : 'flex' 
      ]"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-20">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-gray-900 tracking-tight">Expenses</h1>
            <UBadge 
              v-if="processingCount > 0"
              color="blue" 
              variant="subtle"
              size="sm"
              class="animate-pulse"
            >
              Analyzing {{ processingCount }}...
            </UBadge>
          </div>
          <ReceiptCapture :is-loading="isLoading" @captured="handleCaptured" />
        </div>
        
        <div class="flex items-center justify-between">
          <p class="text-xs text-gray-500">
            {{ expenses.length }} {{ expenses.length === 1 ? 'receipt' : 'receipts' }}
          </p>
          
          <UDropdownMenu 
            :items="[sortOptions.map(opt => ({ 
              label: opt.label, 
              onSelect: () => sortOption = opt.value,
              icon: sortOption === opt.value ? 'i-heroicons-check' : undefined
            }))]"
          >
            <UButton 
              color="neutral" 
              variant="outline" 
              size="xs"
              trailing-icon="i-heroicons-chevron-down"
            >
              {{ currentSortLabel }}
            </UButton>
          </UDropdownMenu>

          <UButton 
            to="/settings" 
            icon="i-heroicons-cog-6-tooth" 
            variant="ghost" 
            color="neutral" 
            size="xs"
            title="Manage Categories"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && expenses.length === 0" class="p-8 text-center">
        <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin text-gray-400 mx-auto mb-2" />
        <p class="text-sm text-gray-500">Loading expenses...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="expenses.length === 0" class="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-receipt-refund" class="text-2xl text-gray-400" />
        </div>
        <h3 class="font-medium text-gray-900 mb-1">No receipts yet</h3>
        <p class="text-sm max-w-[200px]">Upload a receipt to start tracking your expenses.</p>
      </div>

      <!-- List -->
      <div v-else class="flex-1 overflow-y-auto divide-y divide-gray-50">
        <ExpensesExpenseListItem
          v-for="expense in sortedExpenses"
          :key="expense.id"
          :expense="expense"
          :is-selected="selectedId === expense.id"
          :is-duplicate="isDuplicate(expense)"
          @click="selectExpense(expense)"
        />
      </div>
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
      v-else-if="expenses.length > 0"
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
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useExpenses } from '~/composables/useExpenses'
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
  processExpense
} = useExpenses()

onMounted(() => {
  fetchExpenses()
})

// Selection State
const selectedId = ref<string | null>(null)
const selectedExpense = computed(() => 
  expenses.value.find(e => e.id === selectedId.value) || null
)

// Computed Layout
const isDetailOpen = computed(() => !!selectedId.value)

// Sorting
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'merchant-asc'
const sortOption = ref<SortOption>('date-desc')

const sortOptions = [
  { label: 'Date: Newest', value: 'date-desc' as const },
  { label: 'Date: Oldest', value: 'date-asc' as const },
  { label: 'Amount: High to Low', value: 'amount-desc' as const },
  { label: 'Amount: Low to High', value: 'amount-asc' as const },
  { label: 'Merchant: A-Z', value: 'merchant-asc' as const }
]

const sortedExpenses = computed(() => {
  return [...expenses.value].sort((a, b) => {
    switch (sortOption.value) {
      case 'date-asc':
        return new Date(a.date || a.capturedAt || 0).getTime() - new Date(b.date || b.capturedAt || 0).getTime()
      case 'amount-desc':
        return (b.total || 0) - (a.total || 0)
      case 'amount-asc':
        return (a.total || 0) - (b.total || 0)
      case 'merchant-asc':
        return (a.merchant || '').localeCompare(b.merchant || '')
      case 'date-desc':
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

async function handleCaptured({ image, capturedAt }: { image: string, capturedAt: string }) {
  pendingUploads.value++
  try {
    const newExpense = await uploadReceipt(image, capturedAt)
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
  const updated = await processExpense(selectedId.value)
  // Ensure we stay selected on the updated item
  if (updated) {
    // Usually existing object is mutated in place by composable, but safe check
  }
}

// Helpers
function getStatusColor(status: string) {
  switch (status) {
    case 'complete': return 'bg-green-50 text-green-700 ring-green-600/20'
    case 'processing': return 'bg-blue-50 text-blue-700 ring-blue-600/20 animate-pulse'
    case 'error': return 'bg-red-50 text-red-700 ring-red-600/20'
    default: return 'bg-gray-50 text-gray-600 ring-gray-500/10'
  }
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
      <div class="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-gray-900 tracking-tight">Expenses</h1>
            
            <UDropdownMenu 
              :items="[sortOptions.map(opt => ({ 
                label: opt.label, 
                onSelect: () => sortOption = opt.value,
                icon: sortOption === opt.value ? 'i-heroicons-check' : undefined
              }))]"
            >
              <UButton 
                color="neutral" 
                variant="ghost" 
                icon="i-heroicons-funnel" 
                size="xs"
              />
            </UDropdownMenu>

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
          <p class="text-xs text-gray-500 mt-0.5">
            {{ expenses.length }} {{ expenses.length === 1 ? 'receipt' : 'receipts' }}
          </p>
        </div>
        <ReceiptCapture :is-loading="isLoading" @captured="handleCaptured" />
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
      <div v-else class="flex-1 overflow-y-auto divide-y divide-gray-100">
        <div
          v-for="expense in sortedExpenses"
          :key="expense.id"
          class="p-4 cursor-pointer transition-all hover:bg-gray-50 border-l-4"
          :class="[
            selectedId === expense.id 
              ? 'bg-blue-50/50 border-blue-500' 
              : 'border-transparent bg-white'
          ]"
          @click="selectExpense(expense)"
        >
          <div class="flex items-start justify-between gap-3 mb-1">
            <span class="font-semibold text-gray-900 truncate flex-1 text-sm">
              {{ expense.merchant || 'Processing...' }}
            </span>
            <span class="font-mono font-bold text-gray-900 text-sm">
              {{ expense.total ? formatCurrency(expense.total, { decimals: 2 }) : '---' }}
            </span>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span>{{ expense.date ? new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date' }}</span>
              <span v-if="expense.category" class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                {{ expense.category }}
              </span>
            </div>
            
            <span 
              class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium ring-1 ring-inset uppercase tracking-wider"
              :class="getStatusColor(expense.status)"
            >
              {{ expense.status }}
            </span>
          </div>
        </div>
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
<script setup lang="ts">
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

const isEditorOpen = ref(false)
const selectedExpense = ref<Expense | null>(null)

function openExpense(expense: Expense) {
  selectedExpense.value = expense
  isEditorOpen.value = true
}

async function handleCaptured({ image, capturedAt }: { image: string, capturedAt: string }) {
  try {
    const newExpense = await uploadReceipt(image, capturedAt)
    openExpense(newExpense)
  } catch (err) {
    // Error handled in composable
  }
}

async function handleUpdate(updates: Partial<Expense>) {
  if (!selectedExpense.value) return
  await updateExpense(selectedExpense.value.id, updates)
  // Re-fetch or update local state is handled in composable
  // selectedExpense.value remains current via watch in editor or explicit update here if needed
}

async function handleDelete() {
  if (!selectedExpense.value) return
  if (confirm('Are you sure you want to delete this expense and receipt?')) {
    await deleteExpense(selectedExpense.value.id)
    isEditorOpen.value = false
    selectedExpense.value = null
  }
}

async function handleReprocess() {
  if (!selectedExpense.value) return
  const updated = await processExpense(selectedExpense.value.id)
  selectedExpense.value = updated
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'complete': return 'i-heroicons-check-circle'
    case 'processing': return 'i-heroicons-arrow-path'
    case 'error': return 'i-heroicons-exclamation-circle'
    default: return 'i-heroicons-clock'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'complete': return 'text-green-500'
    case 'processing': return 'text-blue-500 animate-spin'
    case 'error': return 'text-red-500'
    default: return 'text-gray-500'
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 pb-20">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Expenses</h1>
        <p class="text-gray-500">Track your actual spending by capturing receipts.</p>
      </div>
      
      <ReceiptCapture :is-loading="isLoading" @captured="handleCaptured" />
    </div>

    <UAlert
      v-if="error"
      color="red"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      :title="error"
    />

    <UCard class="overflow-hidden">
      <div v-if="expenses.length === 0 && !isLoading" class="text-center py-12 text-gray-400">
        <UIcon name="i-heroicons-receipt-refund" class="text-5xl mb-4" />
        <p>No receipts captured yet.</p>
        <p class="text-sm">Click the button above to add your first one.</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="expense in expenses"
          :key="expense.id"
          class="p-4 hover:bg-gray-50 cursor-pointer transition-colors group flex items-center gap-4"
          @click="openExpense(expense)"
        >
          <div class="h-12 w-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
             <UIcon v-if="expense.status !== 'complete'" name="i-heroicons-photo" class="text-gray-400" />
             <img v-else :src="`/api/expenses/${expense.id}/image`" class="object-cover h-full w-full" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <h4 class="font-bold text-gray-900 truncate">
                {{ expense.merchant || 'Processing...' }}
              </h4>
              <span class="font-black text-gray-900">
                {{ expense.total ? formatCurrency(expense.total) : '---' }}
              </span>
            </div>
            
            <div class="flex items-center justify-between text-xs text-gray-500">
              <div class="flex items-center gap-2">
                <span>{{ expense.date || new Date(expense.capturedAt).toLocaleDateString() }}</span>
                <span v-if="expense.category" class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                  {{ expense.category }}
                </span>
              </div>
              
              <div class="flex items-center gap-1">
                <UIcon :name="getStatusIcon(expense.status)" :class="getStatusColor(expense.status)" />
                <span class="capitalize">{{ expense.status }}</span>
              </div>
            </div>
          </div>
          
          <UIcon name="i-heroicons-chevron-right" class="text-gray-300 group-hover:text-primary-500 transition-colors" />
        </div>
      </div>
    </UCard>

    <!-- Editor Modal -->
    <UModal v-model="isEditorOpen" fullscreen>
      <UCard :ui="{ base: 'h-full flex flex-col', body: { base: 'flex-1 overflow-hidden' }, ring: '', divide: 'divide-y divide-gray-100' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900">
              Edit Receipt
            </h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="isEditorOpen = false" />
          </div>
        </template>

        <div class="h-full p-4">
          <ExpenseEditor
            v-if="selectedExpense"
            :expense="selectedExpense"
            @update="handleUpdate"
            @delete="handleDelete"
            @reprocess="handleReprocess"
          />
        </div>
      </UCard>
    </UModal>
  </div>
</template>


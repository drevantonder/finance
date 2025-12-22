<script setup lang="ts">
import type { Expense, ExpenseItem } from '~/types'
import { formatCurrency } from '~/composables/useFormatter'

const props = defineProps<{
  expense: Expense
}>()

const emit = defineEmits<{
  (e: 'update', updates: Partial<Expense>): void
  (e: 'delete'): void
  (e: 'reprocess'): void
}>()

const { getImageUrl } = useExpenses()

const form = ref({
  merchant: props.expense.merchant || '',
  total: props.expense.total || 0,
  tax: props.expense.tax || 0,
  date: props.expense.date || '',
  category: props.expense.category || '',
  notes: props.expense.notes || '',
})

// Update local form when prop changes
watch(() => props.expense, (newVal) => {
  form.value = {
    merchant: newVal.merchant || '',
    total: newVal.total || 0,
    tax: newVal.tax || 0,
    date: newVal.date || '',
    category: newVal.category || '',
    notes: newVal.notes || '',
  }
}, { deep: true })

const items = computed<ExpenseItem[]>(() => {
  if (!props.expense.items) return []
  try {
    return JSON.parse(props.expense.items)
  } catch {
    return []
  }
})

const isDirty = computed(() => {
  return form.value.merchant !== (props.expense.merchant || '') ||
         form.value.total !== (props.expense.total || 0) ||
         form.value.tax !== (props.expense.tax || 0) ||
         form.value.date !== (props.expense.date || '') ||
         form.value.category !== (props.expense.category || '') ||
         form.value.notes !== (props.expense.notes || '')
})

function save() {
  emit('update', { ...form.value })
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
    <!-- Receipt View -->
    <div class="bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center min-h-[400px]">
      <img :src="getImageUrl(expense.id)" class="max-w-full max-h-[80vh] object-contain" />
    </div>

    <!-- Edit Form -->
    <div class="space-y-6 overflow-y-auto pr-2">
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-bold text-gray-900">Expense Details</h3>
        <UBadge
          :color="expense.status === 'complete' ? 'success' : expense.status === 'processing' ? 'primary' : expense.status === 'error' ? 'error' : 'neutral'"
          variant="subtle"
        >
          {{ expense.status.toUpperCase() }}
        </UBadge>
      </div>

      <div class="space-y-4">
        <UFormGroup label="Merchant / Shop">
          <UInput v-model="form.merchant" placeholder="e.g. Woolworths" icon="i-heroicons-building-storefront" />
        </UFormGroup>

        <div class="grid grid-cols-2 gap-4">
          <UFormGroup label="Total Amount">
            <UInput v-model="form.total" type="number" step="0.01" icon="i-heroicons-currency-dollar" />
          </UFormGroup>
          <UFormGroup label="Tax (GST)">
            <UInput v-model="form.tax" type="number" step="0.01" icon="i-heroicons-receipt-tax" />
          </UFormGroup>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormGroup label="Date">
            <UInput v-model="form.date" type="date" icon="i-heroicons-calendar" />
          </UFormGroup>
          <UFormGroup label="Category">
            <USelect
              v-model="form.category"
              :items="['Groceries', 'Utilities', 'Eating Out', 'Transport', 'Healthcare', 'Entertainment', 'Other']"
              icon="i-heroicons-tag"
            />
          </UFormGroup>
        </div>

        <UFormGroup label="Notes">
          <UTextarea v-model="form.notes" placeholder="Optional notes..." />
        </UFormGroup>

        <!-- Line Items (Read Only for now) -->
        <div v-if="items.length > 0" class="space-y-2">
          <label class="text-sm font-medium text-gray-700">Line Items</label>
          <div class="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            <div v-for="(item, idx) in items" :key="idx" class="p-2 flex justify-between text-xs">
              <span class="text-gray-600">{{ item.qty }}x {{ item.name }}</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(item.price) }}</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3 pt-4">
          <UButton
            color="primary"
            block
            icon="i-heroicons-check"
            :disabled="!isDirty"
            label="Save Changes"
            @click="save"
          />
          
          <div class="flex gap-2">
            <UButton
              color="white"
              variant="outline"
              class="flex-1"
              icon="i-heroicons-arrow-path"
              label="Re-process with AI"
              :loading="expense.status === 'processing'"
              @click="emit('reprocess')"
            />
            <UButton
              color="red"
              variant="ghost"
              icon="i-heroicons-trash"
              label="Delete"
              @click="emit('delete')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


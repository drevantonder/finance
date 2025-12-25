<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ExpenseLineItem from '~/components/expenses/ExpenseLineItem.vue'
import type { Expense, ExpenseItem } from '~/types'
import { formatCurrency } from '~/composables/useFormatter'

const props = defineProps<{
  expense: Expense
}>()

const emit = defineEmits<{
  (e: 'update', updates: Partial<Expense>): void
  (e: 'delete'): void
  (e: 'reprocess'): void
  (e: 'close'): void
}>()

const getImageUrl = (id: string) => `/api/expenses/${id}/image`
const isReprocessing = ref(false)

// We rely on the parent or the query cache for loading state, 
// but for the specific "AI is analyzing" overlay, we use the expense status
const isAIProcessing = computed(() => props.expense.status === 'processing' || props.expense.status === 'pending')

// Form State
const form = ref({
  merchant: '',
  total: 0,
  tax: 0,
  date: '',
})

// Line Items State
const lineItems = ref<ExpenseItem[]>([])

// Initialize from props
watch(() => props.expense, (newVal) => {
  form.value = {
    merchant: newVal.merchant || '',
    total: newVal.total || 0,
    tax: newVal.tax || 0,
    date: newVal.date ? new Date(newVal.date).toISOString().split('T')[0] : '',
  }
  
  try {
    lineItems.value = newVal.items ? JSON.parse(newVal.items) : []
  } catch {
    lineItems.value = []
  }
}, { immediate: true, deep: true })

// Derived State
const lineItemsTotal = computed(() => {
  return lineItems.value.reduce((sum, item) => sum + (item.lineTotal || 0), 0)
})

const isDirty = computed(() => {
  const currentItemsJson = JSON.stringify(lineItems.value)
  const propItemsJson = props.expense.items || '[]'
  
  return form.value.merchant !== (props.expense.merchant || '') ||
         Math.abs(form.value.total - (props.expense.total || 0)) > 0.001 ||
         Math.abs(form.value.tax - (props.expense.tax || 0)) > 0.001 ||
         form.value.date !== (props.expense.date ? new Date(props.expense.date).toISOString().split('T')[0] : '') ||
         currentItemsJson !== propItemsJson
})

// Actions
function addLineItem() {
  lineItems.value.push({ name: 'New Item', qty: 1, unit: 'ea', unitPrice: 0, lineTotal: 0 })
}

function updateLineTotal(index: number) {
  const item = lineItems.value[index]
  if (!item) return
  item.lineTotal = Number(((item.qty || 0) * (item.unitPrice || 0)).toFixed(2))
}

function removeLineItem(index: number) {
  lineItems.value.splice(index, 1)
}

function updateTotalFromItems() {
  form.value.total = lineItemsTotal.value
}

function save() {
  emit('update', {
    ...form.value,
    items: JSON.stringify(lineItems.value)
  })
}

// Image handling
const imageError = ref(false)
function handleImageError() {
  imageError.value = true
}

// Zoom handling
const imageRef = ref<{ $el: HTMLElement } | null>(null)
const isZoomed = ref(false)
const zoomPos = ref({ x: 50, y: 50 })

function handleImageMove(e: MouseEvent) {
  if (!imageRef.value || (props.expense.imageKey || '').toLowerCase().endsWith('.pdf')) return
  
  const el = imageRef.value.$el
  const rect = el.getBoundingClientRect()
  const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
  
  zoomPos.value = { x, y }
  isZoomed.value = true
}

function handleImageLeave() {
  isZoomed.value = false
  // Reset to center for smooth zoom out animation
  setTimeout(() => {
    if (!isZoomed.value) zoomPos.value = { x: 50, y: 50 }
  }, 200)
}
</script>

<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Toolbar -->
    <div class="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0">
      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-x-mark"
          class="lg:hidden"
          @click="$emit('close')"
        />
        <div class="flex flex-col">
          <h2 class="text-sm font-semibold text-gray-900 line-clamp-1">
            {{ form.merchant || 'Untitled Expense' }}
          </h2>
          <span class="text-xs text-gray-500 font-mono">
            {{ expense.id.slice(0, 8) }}
          </span>
        </div>
        <UBadge
          :color="expense.status === 'complete' ? 'success' : expense.status === 'processing' ? 'info' : 'error'"
          variant="subtle"
          size="sm"
        >
          {{ expense.status }}
        </UBadge>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          v-if="isDirty"
          color="primary"
          icon="i-heroicons-check"
          size="sm"
          @click="save"
        >
          Save Changes
        </UButton>
        
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          size="sm"
          :loading="isReprocessing"
          :disabled="isReprocessing || isAIProcessing"
          @click="emit('reprocess')"
        >
          Reprocess
        </UButton>

        <UButton
          color="error"
          variant="ghost"
          icon="i-heroicons-trash"
          size="sm"
          :disabled="isAIProcessing"
          @click="emit('delete')"
        >
          Delete
        </UButton>
      </div>
    </div>

    <!-- Content Split -->
    <div class="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
      <!-- Loading Overlay -->
      <div v-if="isAIProcessing" class="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex items-center justify-center">
        <div class="bg-white p-4 rounded-xl shadow-xl border border-gray-100 flex items-center gap-3">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-primary-500" />
          <span class="text-sm font-medium text-gray-700">AI is analyzing receipt...</span>
        </div>
      </div>
      
      <!-- Left: Form -->
      <div class="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 border-b lg:border-b-0 lg:border-r border-gray-200 min-w-0">
        
        <!-- Primary Details -->
        <section class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Merchant</label>
              <UInput 
                v-model="form.merchant" 
                icon="i-heroicons-building-storefront" 
                size="md"
                class="w-full"
              />
            </div>
            
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</label>
              <UInput 
                v-model="form.date" 
                type="date" 
                icon="i-heroicons-calendar" 
                size="md"
                class="w-full"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tax (GST)</label>
              <UInput 
                v-model="form.tax" 
                type="number" 
                step="0.01" 
                icon="i-heroicons-receipt-percent" 
                size="md"
                class="w-full"
              />
            </div>
          </div>
        </section>

        <hr class="border-gray-100" />

        <!-- Line Items -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-gray-900">Line Items</h3>
            <UButton 
              size="xs" 
              color="neutral" 
              variant="ghost" 
              icon="i-heroicons-plus" 
              label="Add Item"
              @click="addLineItem" 
            />
          </div>

          <div v-if="lineItems.length > 0" class="space-y-3">
            <ExpenseLineItem
              v-for="(item, idx) in lineItems" 
              :key="idx" 
              :item="item"
              @update="(val) => { lineItems[idx] = val; updateLineTotal(idx) }"
              @delete="removeLineItem(idx)"
            />
          </div>
          
          <div v-else class="text-center py-8 border-2 border-dashed border-gray-100 rounded-lg">
            <p class="text-sm text-gray-400">No items detected</p>
          </div>

          <!-- Total Calculation -->
          <div class="flex items-center justify-between p-4 bg-gray-900 text-white rounded-lg shadow-sm">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-300">Total</span>
              <div v-if="Math.abs(lineItemsTotal - form.total) > 0.01" class="flex items-center gap-2">
                <span class="text-xs text-warning-500 font-medium">
                  Mismatch: {{ formatCurrency(lineItemsTotal - form.total, { decimals: 2 }) }}
                </span>
                <UButton 
                  size="xs" 
                  color="warning" 
                  variant="subtle" 
                  label="Sync Total"
                  @click="updateTotalFromItems" 
                />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-gray-400 text-sm">$</span>
              <UInput 
                v-model="form.total" 
                type="number" 
                step="0.01"
                variant="none"
                class="w-32 text-right font-bold text-xl !p-0"
                :ui="{ base: 'text-white placeholder-gray-500' }"
              />
            </div>
          </div>
        </section>
      </div>

      <!-- Right: Image/PDF Preview -->
      <div class="flex-1 bg-gray-50 flex flex-col relative group min-h-[500px] lg:min-h-0">
        <div v-if="!imageError" class="absolute inset-0 flex items-center justify-center p-4">
          <SecureImage 
            ref="imageRef"
            :src="getImageUrl(expense.id)" 
            className="w-full h-full rounded-lg shadow-md bg-white transition-transform duration-200" 
            :class="[
              (expense.imageKey || '').toLowerCase().endsWith('.pdf') ? '' : 'cursor-zoom-in',
              isZoomed ? 'cursor-zoom-out' : ''
            ]"
            :style="!(expense.imageKey || '').toLowerCase().endsWith('.pdf') ? { 
              transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
              transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`
            } : {}"
            @mousemove="handleImageMove"
            @mouseleave="handleImageLeave"
            @error="handleImageError"
            alt="Receipt"
          />
          <a 
            :href="getImageUrl(expense.id)" 
            target="_blank"
            class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur text-xs px-3 py-1.5 rounded-full shadow-sm hover:bg-white flex items-center gap-1.5 font-medium text-gray-700 z-10"
          >
            <UIcon name="i-heroicons-arrow-top-right-on-square" />
            Open Original
          </a>
        </div>
        
        <div v-else class="text-center text-gray-400 p-8">
          <UIcon name="i-heroicons-photo" class="text-6xl mb-4 opacity-20" />
          <p class="text-sm font-medium">Image unavailable</p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}
</style>
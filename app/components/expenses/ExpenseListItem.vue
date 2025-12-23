<script setup lang="ts">
import { computed } from 'vue'
import type { Expense } from '~/types'
import { formatCurrency } from '~/composables/useFormatter'
import { useCategories } from '~/composables/useCategories'
import { useExpenses } from '~/composables/useExpenses'

const props = defineProps<{
  expense: Expense
  isSelected?: boolean
  isDuplicate?: boolean
  isChecked?: boolean
  isSelectionMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isChecked', value: boolean): void
  (e: 'toggle', event: MouseEvent): void
}>()

const { getCategoryColor } = useCategories()
const { isProcessing: globalProcessing } = useExpenses()


// Categories Logic
const categories = computed(() => {
  if (!props.expense.items) return []
  try {
    const items = JSON.parse(props.expense.items)
    // Get unique non-empty categories
    return Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[]
  } catch {
    return []
  }
})

// Date Formatting
const formattedDate = computed(() => {
  if (!props.expense.date && !props.expense.capturedAt) return 'No date'
  const date = new Date(props.expense.date || props.expense.capturedAt || '')
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})

// Status Logic
const isProcessing = computed(() => 
  props.expense.status === 'processing' || 
  !!globalProcessing.value[props.expense.id]
)
const isError = computed(() => props.expense.status === 'error' && !isProcessing.value)
const isOffline = computed(() => props.expense.status === 'pending' && !isProcessing.value)

// Version Logic
const CURRENT_SCHEMA_VERSION = 3
const isOutdated = computed(() => (props.expense.schemaVersion || 0) < CURRENT_SCHEMA_VERSION)
</script>

<template>
  <div 
    class="group relative p-3 sm:p-4 cursor-pointer transition-all duration-200 border-l-[3px]"
    :class="[
      isSelected 
        ? 'bg-primary-50/40 border-primary-500' 
        : 'bg-white hover:bg-gray-50/80 border-transparent',
      isProcessing ? 'opacity-70' : 'opacity-100'
    ]"
  >
    <!-- Checkbox Gutter -->
    <div 
      class="absolute left-1.5 top-0 bottom-0 flex items-center justify-center transition-all duration-200"
      :class="[
        isSelectionMode || isChecked ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
      ]"
    >
      <UCheckbox 
        :model-value="isChecked" 
        @click.stop="(e: MouseEvent) => emit('toggle', e)"
        @update:model-value="() => {}"
      />
    </div>

    <!-- Content: Shifted right when checkbox is visible -->
    <div 
      class="transition-all duration-200"
      :class="[isChecked || isSelectionMode ? 'pl-6' : 'pl-0 group-hover:pl-6']"
    >
      <!-- Top Row: Merchant & Amount -->
      <div class="flex items-start justify-between gap-3 mb-1.5">
      <div class="flex items-center gap-2 min-w-0">
        <span class="font-semibold text-gray-900 truncate text-sm">
          {{ expense.merchant || 'Processing receipt...' }}
        </span>
        
        <!-- Status Indicators -->
        <UIcon 
          v-if="isProcessing" 
          name="i-heroicons-arrow-path" 
          class="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" 
        />
        <UIcon 
          v-else-if="isError" 
          name="i-heroicons-exclamation-triangle" 
          class="w-3.5 h-3.5 text-red-500 shrink-0" 
        />
        <UIcon 
          v-else-if="isOffline" 
          name="i-heroicons-cloud-arrow-up" 
          class="w-3.5 h-3.5 text-gray-400 shrink-0" 
        />
      </div>
      
      <span class="font-mono font-bold text-gray-900 text-sm whitespace-nowrap">
        {{ expense.total ? formatCurrency(expense.total, { decimals: 2 }) : '---' }}
      </span>
    </div>

    <!-- Bottom Row: Metadata -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2 text-[11px] text-gray-500 min-w-0 truncate">
        <!-- Categories -->
        <div v-if="categories.length > 0" class="flex gap-1.5 shrink-0">
          <span 
            v-for="cat in categories" 
            :key="cat"
            class="font-medium"
            :style="{ color: getCategoryColor(cat) }"
          >
            {{ cat }}
          </span>
        </div>
        <span v-else class="font-medium text-gray-400 shrink-0">Uncategorized</span>
        
        <span class="text-gray-300">•</span>
        
        <!-- Date -->
        <span class="truncate">{{ formattedDate }}</span>
      </div>

      <!-- Badges / Warnings -->
      <div class="flex items-center gap-1.5 shrink-0">
        <span 
          v-if="isDuplicate" 
          class="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider shadow-sm"
        >
          Duplicate
        </span>
        
        <UBadge 
          v-if="isOutdated && !isProcessing" 
          color="gray" 
          variant="subtle" 
          size="xs"
          class="font-mono h-4 px-1"
          :ui="{ rounded: 'rounded-sm' }"
        >
          v{{ expense.schemaVersion || 1 }}
          <template #trailing>
            <UIcon name="i-heroicons-arrow-up-circle" class="w-2.5 h-2.5 ml-0.5" />
          </template>
        </UBadge>
      </div>
    </div>
    </div>
  </div>
</template>
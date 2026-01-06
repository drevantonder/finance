<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  count: number
  processingCount: number
  sortOption: string
  sortOptions: { label: string, value: string }[]
  // Selection
  isAllSelected?: boolean
  isIndeterminate?: boolean
  isSelectionMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:sortOption', value: any): void
  (e: 'toggle-all'): void
}>()

// Handle indeterminate state for native checkbox
const checkboxRef = ref<HTMLInputElement | null>(null)
watch(() => props.isIndeterminate, (val) => {
  if (checkboxRef.value) checkboxRef.value.indeterminate = !!val
})

const currentSortLabel = computed(() => 
  props.sortOptions.find(opt => opt.value === props.sortOption)?.label || 'Newest'
)

const displaySortLabel = computed(() => {
  return currentSortLabel.value.replace('Invoice Date: ', '').replace('Photo Date: ', '').replace('Processed Date: ', '')
})
</script>

<template>
  <header class="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-gray-100/50 bg-white/80 backdrop-blur-md transition-all group">
    <!-- Select All Checkbox (Aligned with List Items) -->
    <div 
      class="absolute left-1.5 flex items-center justify-center transition-all duration-200"
      :class="[
        isSelectionMode || isAllSelected || isIndeterminate 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 -translate-x-2 group-hover:opacity-50 hover:!opacity-100 group-hover:translate-x-0'
      ]"
    >
      <input
        ref="checkboxRef"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
        :checked="isAllSelected"
        @change="emit('toggle-all')"
      />
    </div>

    <!-- Left Group -->
    <div 
      class="flex items-baseline gap-3 transition-all duration-200"
      :class="[isSelectionMode || isAllSelected || isIndeterminate ? 'pl-6' : 'pl-0 group-hover:pl-6']"
    >
      <h1 class="text-xl font-semibold tracking-tight text-gray-900">Expenses</h1>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-400 tabular-nums">{{ count }}</span>
        <UBadge 
          v-if="processingCount > 0"
          color="info" 
          variant="subtle"
          size="xs"
          class="animate-pulse"
        >
          Analyzing {{ processingCount }}...
        </UBadge>
      </div>
    </div>

    <!-- Right Group -->
    <div class="flex items-center gap-2">
      <!-- Sort -->
      <UDropdownMenu 
        :items="[sortOptions.map(opt => ({ 
          label: opt.label, 
          onSelect: () => emit('update:sortOption', opt.value),
          icon: sortOption === opt.value ? 'i-heroicons-check' : undefined
        }))]"
      >
        <UButton 
          variant="ghost" 
          color="neutral" 
          size="xs" 
          class="font-medium text-gray-600 hover:bg-gray-100"
        >
          {{ displaySortLabel }}
          <template #trailing>
            <UIcon name="i-heroicons-chevron-down-20-solid" class="w-4 h-4 text-gray-400" />
          </template>
        </UButton>
      </UDropdownMenu>
    </div>
  </header>
</template>

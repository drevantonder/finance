<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { ExpenseItem } from '~/types'
import { formatCurrency } from '~/composables/useFormatter'
import { useCategories } from '~/composables/useCategories'

const props = defineProps<{
  item: ExpenseItem
}>()

const emit = defineEmits<{
  (e: 'update', item: ExpenseItem): void
  (e: 'delete'): void
}>()

const { getCategoryColor, fetchCategories } = useCategories()
onMounted(fetchCategories)

const isEditing = ref(false)
const localItem = ref<ExpenseItem>({ ...props.item })

// Update local state when prop changes
watch(() => props.item, (newVal) => {
  if (newVal) {
    localItem.value = { ...newVal }
  }
}, { deep: true })

function handleBlur() {
  const qty = Number(localItem.value.qty) || 0
  const unitPrice = Number(localItem.value.unitPrice) || 0
  
  // If editing the calculation fields, ensure lineTotal is updated
  localItem.value.lineTotal = Number((qty * unitPrice).toFixed(2))
  
  isEditing.value = false
  if (JSON.stringify(localItem.value) !== JSON.stringify(props.item)) {
    emit('update', { ...localItem.value })
  }
}

function toggleEdit() {
  isEditing.value = true
}
</script>

<template>
  <div 
    class="group relative bg-white border rounded-xl p-3.5 transition-all"
    :class="[
      isEditing 
        ? 'border-primary-500 ring-2 ring-primary-500/10 shadow-sm' 
        : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'
    ]"
  >
    <!-- Row 1: Name & Total & Category -->
    <div class="flex justify-between items-start gap-4 mb-1.5">
      <div class="flex-1 min-w-0 flex items-center gap-2">
        <input
          v-if="isEditing"
          v-model="localItem.name"
          class="flex-1 text-sm font-semibold text-gray-900 bg-transparent focus:outline-none placeholder-gray-400"
          placeholder="Item name"
          @blur="handleBlur"
          @keydown.enter="handleBlur"
          autofocus
        />
        <span 
          v-else 
          class="flex-1 text-sm font-semibold text-gray-900 truncate cursor-text"
          @click="toggleEdit"
        >
          {{ localItem.name || 'Untitled Item' }}
        </span>

        <span 
          v-if="localItem.category" 
          class="shrink-0 text-[10px] font-bold uppercase tracking-wider transition-colors"
          :style="{ color: getCategoryColor(localItem.category) }"
        >
          {{ localItem.category }}
        </span>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <div v-if="isEditing" class="w-24">
          <UInput
            v-model.number="localItem.lineTotal"
            type="number"
            step="0.01"
            size="xs"
            placeholder="Total"
            :ui="{ base: 'text-right font-bold' }"
            @blur="handleBlur"
            @keydown.enter="handleBlur"
          >
            <template #leading><span class="text-gray-400">$</span></template>
          </UInput>
        </div>
        <span 
          v-else 
          class="text-sm font-bold text-gray-900 font-mono cursor-text"
          @click="toggleEdit"
        >
          {{ formatCurrency(localItem.lineTotal, { decimals: 2 }) }}
        </span>
      </div>
    </div>

    <!-- Row 2: Details & Actions -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Calculation -->
        <div 
          class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-50/50 group-hover:bg-gray-50 transition-colors cursor-text"
          @click="toggleEdit"
        >
          <template v-if="isEditing">
            <input 
              v-model.number="localItem.qty" 
              type="number"
              class="w-8 bg-transparent text-center text-xs font-medium text-gray-600 focus:outline-none"
              @blur="handleBlur"
            />
            <span class="text-[10px] text-gray-400">×</span>
            <input 
              v-model.number="localItem.unitPrice" 
              type="number"
              step="0.01"
              class="w-14 bg-transparent text-right text-xs font-medium text-gray-600 focus:outline-none"
              @blur="handleBlur"
            />
            <input 
              v-model="localItem.unit"
              class="w-8 bg-transparent text-xs text-gray-400 focus:outline-none"
              placeholder="ea"
              @blur="handleBlur"
            />
          </template>
          <template v-else>
            <span class="text-xs font-medium text-gray-500">{{ localItem.qty }}</span>
            <span class="text-[10px] text-gray-400">×</span>
            <span class="text-xs font-medium text-gray-500">{{ formatCurrency(localItem.unitPrice, { decimals: 2 }) }}</span>
            <span class="text-[10px] text-gray-400 lowercase">{{ localItem.unit || 'ea' }}</span>
          </template>
        </div>

        <!-- Tax Badge -->
        <UTooltip v-if="localItem.taxable" text="GST Applied">
          <div class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-500 ring-1 ring-inset ring-blue-500/20">
            <span class="text-[9px] font-black">T</span>
          </div>
        </UTooltip>
      </div>

      <!-- Delete button -->
      <UButton
        color="red"
        variant="ghost"
        icon="i-heroicons-trash"
        size="xs"
        class="opacity-0 group-hover:opacity-100 transition-opacity"
        @click="$emit('delete')"
      />
    </div>
  </div>
</template>

<style scoped>
/* Remove arrows from number inputs */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>

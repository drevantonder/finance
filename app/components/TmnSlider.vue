<template>
  <div :class="compact ? '' : 'rounded-xl bg-white p-6 shadow'">
    <div v-if="!compact" class="flex items-center justify-between mb-4">
      <label class="text-sm font-medium text-gray-700">TMN</label>
      <div class="text-2xl font-bold text-gray-900">
        {{ formatCurrency(modelValue) }}
      </div>
    </div>

    <USlider
      :model-value="modelValue"
      :min="6000"
      :max="14000"
      :step="100"
      :color="compact ? 'neutral' : 'primary'"
      :size="compact ? 'xs' : 'lg'"
      @update:model-value="(val) => $emit('update:modelValue', val as number)"
    />

    <div v-if="!compact" class="mt-3 flex items-center justify-between text-xs text-gray-500">
      <span>$6,000</span>
      <span>$14,000</span>
    </div>

    <!-- Show calculated FP -->
    <div v-if="!compact" class="mt-4 pt-4 border-t border-gray-100">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600">→ Financial Package (FP)</span>
        <span class="font-semibold text-gray-900">{{ formatCurrency(calculatedFP) }}</span>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        After deductions & levies. 
        <NuxtLink to="/household" class="text-primary-600 hover:underline">View breakdown →</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/composables/useFormatter'
import { calculateFPForValue } from '~/composables/useTmnCalculator'

const props = defineProps<{
  modelValue: number
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const store = useSessionStore()

const calculatedFP = computed(() => {
  // Try to find the TMN source that matches this value, or just use first TMN source for deductions
  const tmnSource = store.config.incomeSources.find(s => s.type === 'tmn')
  if (tmnSource?.tmn) {
    return calculateFPForValue(props.modelValue, tmnSource.tmn.mmr, tmnSource.tmn.giving)
  }
  return 0
})
</script>


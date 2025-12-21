<template>
  <div class="space-y-1">
    <div class="flex items-center justify-between">
      <label class="block text-sm font-medium text-gray-900">{{ label }}</label>
      <div class="flex items-center gap-2">
        <span class="rounded bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700">{{ formattedValue }}</span>
        <UButton 
          v-if="tooltip"
          variant="ghost" 
          size="xs" 
          class="rounded-full"
          aria-label="Help"
          @click="showHelp = !showHelp"
        >
          <UIcon name="i-heroicons-question-mark-circle" class="h-4 w-4" />
        </UButton>
      </div>
    </div>
    
    <!-- Nuxt UI range slider -->
    <USlider
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step || 1"
      :color="rangeColor"
      @update:model-value="(val) => $emit('update:modelValue', val as number)"
      aria-label="Slider"
    />
    
    <!-- Tooltip/help text -->
    <div v-if="tooltip && showHelp" class="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
      {{ tooltip }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  modelValue: number
  min: number
  max: number
  step?: number
  currency?: boolean
  tooltip?: string
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()

const showHelp = ref(false)

const rangeColor = computed(() => (props.currency || props.label.toLowerCase().includes('tmn')) ? 'primary' : 'neutral')

const formattedValue = computed(() => {
  const val = props.modelValue ?? 0
  if (props.currency) return '$' + Math.round(val).toLocaleString()
  if (props.max > 10) return Math.round(val).toLocaleString()
  return Math.round(val * 100) / 100
})
</script>
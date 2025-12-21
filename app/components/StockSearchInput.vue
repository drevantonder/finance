<template>
  <UInputMenu
    :model-value="modelValue"
    @update:model-value="onSelect"
    :items="options"
    :loading="loading"
    v-model:search-term="searchTerm"
    ignore-filter
    placeholder="Search symbol..."
    label-key="symbol"
    value-key="fullSymbol"
    :debounce="800"
    size="sm"
    class="font-mono uppercase w-full"
    :class="isFailed ? 'border-red-400' : ''"
  >
    <template #item-label="{ item }">
      <div class="flex flex-col text-left w-full truncate py-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-bold">{{ item.symbol }}</span>
            <span class="text-[10px] text-blue-600 bg-blue-50 px-1 rounded uppercase">{{ item.exchange }}</span>
          </div>
          <div v-if="item.price" class="text-xs font-medium text-gray-900">
            ${{ item.price.toFixed(2) }} <span class="text-[10px] text-gray-400 font-normal">{{ item.currency }}</span>
          </div>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span class="text-xs text-gray-500 truncate max-w-[150px]">{{ item.name }}</span>
          <span class="text-[10px] text-gray-400 bg-gray-50 px-1 rounded">{{ item.type }}</span>
        </div>
      </div>
    </template>
    <template #empty>
      <div class="text-sm text-gray-500 p-2 text-center">
        {{ loading ? 'Searching...' : 'No results found' }}
      </div>
    </template>
  </UInputMenu>
</template>

<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { useStockPrices } from '~/composables/useStockPrices'

const props = defineProps<{
  modelValue: string
  isFailed?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': [value: string]
}>()

const stockPrices = useStockPrices()

const searchTerm = ref('')
// Debounce the search term to avoid hitting API on every keystroke
const debouncedSearch = refDebounced(searchTerm, 500)

const options = ref<any[]>([])
const loading = ref(false)

// Sync searchTerm with modelValue when it changes from outside
// This ensures the input shows the selected symbol correctly after selection
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    searchTerm.value = newVal
  } else {
    searchTerm.value = ''
  }
}, { immediate: true })

// Watch for debounced search term changes
watch(debouncedSearch, async (query) => {
  if (!query || query.length < 2) {
    options.value = []
    return
  }

  loading.value = true
  try {
    const results = await stockPrices.searchStocks(query)
    options.value = results
  } finally {
    loading.value = false
  }
})

function onSelect(value: any) {
  // Extract info from value (might be a string or an object from the list)
  let symbol = ''
  let price = null
  let label = ''
  
  if (typeof value === 'object' && value !== null) {
    symbol = value.fullSymbol || value.symbol
    price = value.price
    label = value.symbol || symbol
  } else {
    symbol = value
    // Try to find the label from existing options if value is just the fullSymbol string
    const match = options.value.find(o => o.fullSymbol === symbol || o.symbol === symbol)
    if (match) {
      price = match.price
      label = match.symbol
    }
  }
  
  if (!symbol) return

  // If we have a price from the search, let's seed it immediately 
  if (price !== null && !isNaN(price)) {
    stockPrices.seedPrice(symbol, price)
  }
  
  emit('update:modelValue', symbol)
  emit('blur', symbol)
}
</script>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  label: string
  value: string | number
  shortcutKey?: string
  isReference?: boolean
  warning?: boolean
}>()

const isCopied = ref(false)

async function copyToClipboard() {
  if (props.isReference || !props.value) return
  
  try {
    await navigator.clipboard.writeText(props.value.toString())
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 600)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

defineExpose({ copyToClipboard })
</script>

<template>
  <div
    class="relative p-5 rounded-2xl transition-all duration-200 flex flex-col gap-2 min-h-[120px] group"
    :class="[
      isReference 
        ? 'border-2 border-dashed border-gray-200 bg-gray-50/50 cursor-default' 
        : 'bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 cursor-pointer active:scale-[0.98]',
      isCopied ? 'border-success-500 ring-2 ring-success-500/20 bg-success-50/10' : '',
      warning ? 'border-warning-200 bg-warning-50/30' : ''
    ]"
    @click="copyToClipboard"
  >
    <!-- Label & Shortcut -->
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ label }}</span>
      <UKbd v-if="shortcutKey && !isReference" size="sm" class="opacity-50 group-hover:opacity-100 transition-opacity">
        {{ shortcutKey }}
      </UKbd>
    </div>

    <!-- Value -->
    <div class="flex-1 flex items-center">
      <div 
        class="text-lg font-bold truncate transition-colors w-full"
        :class="[
          isReference ? 'text-gray-600 font-mono text-sm' : 'text-gray-900',
          warning ? 'text-warning-600' : ''
        ]"
      >
        <template v-if="value">
          {{ value }}
        </template>
        <template v-else-if="warning">
          Not Linked
        </template>
        <template v-else>
          —
        </template>
      </div>
    </div>

    <!-- Feedback Overlay -->
    <div 
      v-if="isCopied" 
      class="absolute inset-0 flex items-center justify-center bg-success-500/10 rounded-2xl backdrop-blur-[1px]"
    >
      <div class="bg-success-500 text-white rounded-full p-1 shadow-lg scale-110 animate-in zoom-in duration-200">
        <UIcon name="i-heroicons-check" class="w-5 h-5" />
      </div>
    </div>
  </div>
</template>

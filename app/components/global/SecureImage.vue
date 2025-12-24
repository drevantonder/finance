<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  src: string
  alt?: string
  className?: string
}>()

const objectUrl = ref<string | null>(null)
const isLoading = ref(true)
const error = ref(false)

async function loadImage() {
  if (!props.src) return
  
  isLoading.value = true
  error.value = false
  
  try {
    const blob = await $fetch<Blob>(props.src)
    
    if (objectUrl.value) {
      URL.revokeObjectURL(objectUrl.value)
    }
    
    objectUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    console.error('Failed to load secure image:', err)
    error.value = true
  } finally {
    isLoading.value = false
  }
}

watch(() => props.src, loadImage, { immediate: true })

onBeforeUnmount(() => {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
  }
})
</script>

<template>
  <div :class="['relative overflow-hidden bg-gray-100 dark:bg-gray-800', className]">
    <template v-if="isLoading">
      <div class="absolute inset-0 flex items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
      </div>
    </template>
    
    <template v-else-if="error">
      <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 mb-2" />
        <span class="text-xs">Failed to load image</span>
      </div>
    </template>
    
    <img 
      v-else-if="objectUrl" 
      :src="objectUrl" 
      :alt="alt" 
      class="w-full h-full object-cover"
    />
  </div>
</template>

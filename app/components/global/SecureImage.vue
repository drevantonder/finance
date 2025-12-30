<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'

const props = defineProps<{
  src: string
  alt?: string
  className?: string
}>()

const objectUrl = ref<string | null>(null)
const htmlContent = ref<string | null>(null)
const isLoading = ref(true)
const error = ref(false)
const detectedMimeType = ref<string | null>(null)

const isPdf = computed(() => detectedMimeType.value === 'application/pdf')
const isHtml = computed(() => detectedMimeType.value?.startsWith('text/html'))
const isText = computed(() => detectedMimeType.value?.startsWith('text/') && !isHtml.value)
const isImage = computed(() => detectedMimeType.value?.startsWith('image/'))

async function loadResource() {
  if (!props.src) return
  
  isLoading.value = true
  error.value = false
  htmlContent.value = null
  
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = null
  }
  
  try {
    const blob = await $fetch<Blob>(props.src, { responseType: 'blob' })
    detectedMimeType.value = blob.type
    
    if (blob.type.startsWith('text/')) {
      let text = await blob.text()
      if (blob.type === 'text/plain') {
        text = `<pre style="white-space: pre-wrap; font-family: monospace; padding: 1rem;">${text}</pre>`
      }
      htmlContent.value = text
    } else {
      objectUrl.value = URL.createObjectURL(blob)
    }
  } catch (err) {
    console.error('Failed to load secure resource:', err)
    error.value = true
  } finally {
    isLoading.value = false
  }
}

watch(() => props.src, loadResource, { immediate: true })

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
        <span class="text-xs">Failed to load</span>
      </div>
    </template>
    
    <img 
      v-else-if="objectUrl && isImage" 
      :src="objectUrl" 
      :alt="alt" 
      class="w-full h-full object-contain"
    />

    <iframe
      v-else-if="objectUrl && isPdf"
      :src="objectUrl"
      class="w-full h-full border-0"
      sandbox="allow-same-origin allow-scripts"
    />

    <iframe
      v-else-if="htmlContent && (isHtml || isText)"
      :srcdoc="htmlContent"
      class="w-full h-full border-0"
      sandbox="allow-same-origin"
    />
  </div>
</template>

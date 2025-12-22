<script setup lang="ts">
const props = defineProps<{
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'captured', data: { image: string, capturedAt: string }): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const previewImage = ref<string | null>(null)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)

const MAX_SIZE = 1920
const QUALITY = 0.8

function triggerCamera() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Reset state
  errorMessage.value = null
  isProcessing.value = true
  
  const capturedAt = new Date().toISOString()

  // Simple FileReader approach (same as HTML5-ImageUploader)
  const reader = new FileReader()
  
  reader.onload = function(readerEvent) {
    const dataUrl = readerEvent.target?.result as string
    if (!dataUrl) {
      errorMessage.value = 'Failed to read file'
      isProcessing.value = false
      return
    }

    // Create image to get dimensions and resize
    const img = new Image()
    
    img.onload = function() {
      // Calculate new dimensions
      let width = img.width
      let height = img.height
      
      if (width > height) {
        if (width > MAX_SIZE) {
          height = height * (MAX_SIZE / width)
          width = MAX_SIZE
        }
      } else {
        if (height > MAX_SIZE) {
          width = width * (MAX_SIZE / height)
          height = MAX_SIZE
        }
      }

      // Draw to canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        errorMessage.value = 'Failed to create canvas context'
        isProcessing.value = false
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      
      // Get resized base64
      const resizedDataUrl = canvas.toDataURL('image/jpeg', QUALITY)
      
      previewImage.value = resizedDataUrl
      emit('captured', { image: resizedDataUrl, capturedAt })
      isProcessing.value = false
    }
    
    img.onerror = function() {
      errorMessage.value = 'Failed to decode image'
      isProcessing.value = false
    }
    
    img.src = dataUrl
  }
  
  reader.onerror = function() {
    errorMessage.value = `File read error: ${reader.error?.message || 'Unknown error'}`
    isProcessing.value = false
  }
  
  // This is the key - read as DataURL, not ArrayBuffer
  reader.readAsDataURL(file)
  
  // Clear input so same file can be selected again
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="handleFileChange"
    />
    
    <UButton
      icon="i-heroicons-camera"
      size="xl"
      color="primary"
      :loading="isLoading || isProcessing"
      label="Add Receipt"
      @click="triggerCamera"
    />

    <p v-if="errorMessage" class="text-red-500 text-sm mt-2 max-w-xs text-center">{{ errorMessage }}</p>
    
    <div v-if="previewImage" class="relative w-full max-w-xs mt-4">
      <img :src="previewImage" class="rounded-lg shadow-md w-full" />
      <div v-if="isLoading" class="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-primary-500 text-3xl" />
      </div>
    </div>
  </div>
</template>

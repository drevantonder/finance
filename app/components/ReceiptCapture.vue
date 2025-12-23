<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'captured', data: { image: string, capturedAt: string }): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const uploadProgress = ref({ current: 0, total: 0 })

const MAX_SIZE = 1920
const QUALITY = 0.8

function triggerCamera() {
  fileInput.value?.click()
}

async function processFile(file: File, index: number, total: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use the file's last modified date (when photo was taken) if available
    const capturedAt = file.lastModified 
      ? new Date(file.lastModified).toISOString() 
      : new Date().toISOString()

    const reader = new FileReader()
    
    reader.onload = function(readerEvent) {
      const dataUrl = readerEvent.target?.result as string
      if (!dataUrl) {
        reject(new Error('Failed to read file'))
        return
      }

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
          reject(new Error('Failed to create canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        
        // Get resized base64
        const resizedDataUrl = canvas.toDataURL('image/jpeg', QUALITY)
        
        emit('captured', { image: resizedDataUrl, capturedAt })
        uploadProgress.value.current++
        resolve()
      }
      
      img.onerror = function() {
        reject(new Error('Failed to decode image'))
      }
      
      img.src = dataUrl
    }
    
    reader.onerror = function() {
      reject(new Error(`File read error: ${reader.error?.message || 'Unknown error'}`))
    }
    
    reader.readAsDataURL(file)
  })
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  // Reset state
  errorMessage.value = null
  isProcessing.value = true
  uploadProgress.value = { current: 0, total: files.length }
  
  // Process files with concurrency limit of 20
  const CONCURRENCY_LIMIT = 20
  const filesArray = Array.from(files)
  const errors: string[] = []
  
  // Split into batches
  for (let i = 0; i < filesArray.length; i += CONCURRENCY_LIMIT) {
    const batch = filesArray.slice(i, i + CONCURRENCY_LIMIT)
    const promises = batch.map((file, batchIndex) => 
      processFile(file, i + batchIndex, filesArray.length)
        .catch(error => {
          errors.push(`File ${i + batchIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        })
    )
    
    await Promise.all(promises)
  }
  
  if (errors.length > 0) {
    errorMessage.value = errors.join('; ')
  }
  
  isProcessing.value = false
  
  // Clear input so same files can be selected again
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="flex flex-col items-end gap-2">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handleFileChange"
    />
    
    <UButton
      icon="i-heroicons-plus"
      size="sm"
      color="primary"
      :loading="isLoading || isProcessing"
      label="Add Receipts"
      @click="triggerCamera"
    />

    <div v-if="isProcessing && uploadProgress.total > 0" class="w-48 space-y-1.5">
      <div class="flex justify-between text-xs text-gray-600 font-medium">
        <span>Processing...</span>
        <span>{{ uploadProgress.current }} / {{ uploadProgress.total }}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div 
          class="bg-primary-600 h-1.5 rounded-full transition-all duration-300 ease-out"
          :style="{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }"
        ></div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-red-500 text-xs max-w-xs text-right">{{ errorMessage }}</p>
  </div>
</template>

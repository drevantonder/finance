<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'captured', data: { image: string, capturedAt: string, imageHash: string }): void
  (e: 'cancelled'): void
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
    
    reader.onload = async function(readerEvent) {
      const dataUrl = readerEvent.target?.result as string
      if (!dataUrl) {
        reject(new Error('Failed to read file'))
        return
      }

      // 1. Handle PDF directly (no resizing)
      if (file.type === 'application/pdf') {
        const imageHash = `pdf-${file.name}-${file.size}-${file.lastModified}`
        emit('captured', { image: dataUrl, capturedAt, imageHash })
        uploadProgress.value.current++
        resolve()
        return
      }

      // 2. Handle Images (with hashing and resizing)
      const base64Data = dataUrl.split(',')[1]
      if (!base64Data) {
        reject(new Error('Failed to parse base64 data'))
        return
      }
      const binaryData = atob(base64Data)
      const bytes = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) bytes[i] = binaryData.charCodeAt(i)
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const imageHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // Check if hash already exists
      try {
        const { exists } = await $fetch<{ exists: boolean }>(`/api/expenses/check-hash?hash=${imageHash}`)
        if (exists) {
          uploadProgress.value.current++
          resolve() // Skip upload
          return
        }
      } catch (e) {
        console.warn('Hash check failed, proceeding with upload')
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

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to create canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const resizedDataUrl = canvas.toDataURL('image/jpeg', QUALITY)
        
        emit('captured', { image: resizedDataUrl, capturedAt, imageHash })
        uploadProgress.value.current++

        resolve()
      }
      
      img.onerror = () => reject(new Error('Failed to decode image'))
      img.src = dataUrl
    }
    
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsDataURL(file)
  })
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) {
    emit('cancelled')
    return
  }

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

defineExpose({ triggerCamera })
</script>

<template>
  <input
    ref="fileInput"
    type="file"
    accept="image/*,application/pdf"
    capture="environment"
    multiple
    class="hidden"
    @change="handleFileChange"
  />
</template>

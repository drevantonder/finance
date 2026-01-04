<script setup lang="ts">
import { onLongPress, useSessionStorage } from '@vueuse/core'
import type { ProcessedFile } from '~/composables/useFileProcessor'

const { addToQueue } = useUploadQueue()
const { vibrate } = useNotifications()
const toast = useToast()

// Inputs
const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const captureBtn = ref<HTMLElement | null>(null)

// State
const showTooltip = ref(false)
const hasSeenTooltip = useSessionStorage('finance-capture-tooltip-seen', false)
const fileSelected = ref(false)

const handleFiles = async (files: FileList | null) => {
  if (!files || files.length === 0) return

  fileSelected.value = true
  vibrate('tap')

  for (const file of Array.from(files)) {
    try {
      const { processFile } = useFileProcessor()
      const processed = await processFile(file)
      
      if (!processed.cropApplied && processed.cropReason && processed.cropReason !== 'no_contour' && processed.cropReason !== 'success') {
        toast.add({
          title: 'Full image uploaded',
          description: 'Could not detect receipt edges',
          color: 'warning'
        })
      }
      
      addToQueue(processed)
    } catch (e) {
      console.error('Failed to process file:', e)
    }
  }
}

// Detection for camera cancellation
const watchForCancel = () => {
  fileSelected.value = false

  const onFocus = () => {
    setTimeout(() => {
      if (!fileSelected.value && !hasSeenTooltip.value) {
        showTooltip.value = true
        hasSeenTooltip.value = true
        setTimeout(() => { showTooltip.value = false }, 5000)
      }
      window.removeEventListener('focus', onFocus)
    }, 300)
  }

  window.addEventListener('focus', onFocus)
}

const openCamera = () => {
  vibrate('tap')
  watchForCancel()
  cameraInput.value?.click()
}

// Long Press Logic - opens full file picker (includes PDFs + multiple files)
onLongPress(captureBtn, () => {
  vibrate('tap')
  fileInput.value?.click()
}, { delay: 600 })
</script>

<template>
  <div class="relative flex flex-col items-center gap-1 min-w-[64px]">
    <!-- Hidden Inputs -->
    <div class="fixed top-0 left-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none">
      <input
        ref="cameraInput"
        type="file"
        accept="image/*"
        capture="environment"
        @change="e => handleFiles((e.target as HTMLInputElement).files)"
      >
      <input
        ref="fileInput"
        type="file"
        accept="image/*,application/pdf"
        multiple
        @change="e => handleFiles((e.target as HTMLInputElement).files)"
      >
    </div>

    <!-- Tooltip -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <div
        v-if="showTooltip"
        class="absolute bottom-full mb-4 z-50 w-48 p-3 bg-neutral-900 text-white text-xs rounded-xl shadow-xl text-center"
      >
        <div class="font-bold mb-1">Pro Tip</div>
        Long-press to upload PDFs or multiple images.
        <!-- Arrow -->
        <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-neutral-900" />
      </div>
    </Transition>

    <!-- Main Button -->
    <button
      ref="captureBtn"
      @click="openCamera"
      @contextmenu.prevent
      class="h-14 w-14 -mt-6 flex items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all active:scale-95 touch-none select-none"
      aria-label="Capture receipt"
    >
      <UIcon name="i-heroicons-camera" class="h-7 w-7" />
    </button>
    
    <span class="text-[10px] font-bold uppercase tracking-wider text-primary-600">Capture</span>
  </div>
</template>

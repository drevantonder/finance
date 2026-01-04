<script setup lang="ts">
import { useSessionStorage } from '@vueuse/core'
import type { ProcessedFile } from '~/composables/useFileProcessor'

const { addToQueue } = useUploadQueue()
const { vibrate } = useNotifications()
const toast = useToast()

// Input - single input that we modify based on gesture
const fileInput = ref<HTMLInputElement | null>(null)
const captureBtn = ref<HTMLElement | null>(null)

// State
const showTooltip = ref(false)
const hasSeenTooltip = useSessionStorage('finance-capture-tooltip-seen', false)
const fileSelected = ref(false)
const longPressTimer = ref<any>(null)
const isLongPress = ref(false)

const handleFiles = async (files: FileList | null) => {
  if (!files || files.length === 0) return

  fileSelected.value = true
  // If they selected multiple files or a PDF, they've figured out "pro" feature
  const hasProFile = Array.from(files).some(f => f.type === 'application/pdf' || files.length > 1)
  if (hasProFile) {
    hasSeenTooltip.value = true
  }
  
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
      if (!fileSelected.value) {
        showTooltip.value = true
        setTimeout(() => { showTooltip.value = false }, 5000)
      }
      window.removeEventListener('focus', onFocus)
    }, 300)
  }

  window.addEventListener('focus', onFocus)
}

// Reset input to default camera mode
const resetInputToCamera = () => {
  if (fileInput.value) {
    fileInput.value.setAttribute('capture', 'environment')
    fileInput.value.removeAttribute('multiple')
    fileInput.value.setAttribute('accept', 'image/*')
  }
}

// Convert input to file picker mode (for long-press)
const setInputToFilePicker = () => {
  if (fileInput.value) {
    fileInput.value.removeAttribute('capture')
    fileInput.value.setAttribute('multiple', '')
    fileInput.value.setAttribute('accept', 'image/*,application/pdf')
  }
}

const onTouchStart = (e: TouchEvent) => {
  // Reset state
  isLongPress.value = false
  
  // Clear any existing timer
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
  }
  
  // Start long press detection
  longPressTimer.value = setTimeout(() => {
    isLongPress.value = true
    vibrate('success')
    // Modify the input to file picker mode
    setInputToFilePicker()
  }, 600)
}

const onTouchEnd = (e: TouchEvent) => {
  // Clear the timer
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  // Reset to camera mode for next time
  setTimeout(() => {
    resetInputToCamera()
  }, 0)
  
  // Cancel the touch event so it doesn't trigger a click
  if (e.cancelable) {
    e.preventDefault()
  }
  
  // Trigger the input click
  watchForCancel()
  fileInput.value?.click()
}

const onTouchCancel = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  resetInputToCamera()
}

// Desktop mouse support
const onClick = () => {
  if (!isLongPress.value) {
    resetInputToCamera()
  }
  watchForCancel()
  fileInput.value?.click()
}
</script>

<template>
  <div class="relative flex flex-col items-center gap-1 min-w-[64px]">
    <!-- Hidden Input - we modify attributes dynamically -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      @change="e => handleFiles((e.target as HTMLInputElement).files)"
      class="fixed top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
    >

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
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
      @touchcancel="onTouchCancel"
      @click="onClick"
      @contextmenu.prevent
      class="h-14 w-14 -mt-6 flex items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all active:scale-95 select-none"
      style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none;"
      aria-label="Capture receipt"
    >
      <UIcon name="i-heroicons-camera" class="h-7 w-7" />
    </button>
    
    <span class="text-[10px] font-bold uppercase tracking-wider text-primary-600">Capture</span>
  </div>
</template>


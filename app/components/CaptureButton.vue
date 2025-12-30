<script setup lang="ts">
import { onLongPress, useLocalStorage } from '@vueuse/core'

const { addToQueue } = useUploadQueue()
const { vibrate } = useNotifications()

// Inputs
const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const libraryInput = ref<HTMLInputElement | null>(null)
const captureBtn = ref<HTMLElement | null>(null)

// State
const showMenu = ref(false)
const showTooltip = ref(false)
const hasSeenTooltip = useLocalStorage('finance-capture-tooltip-seen', false)
const fileSelected = ref(false)

const handleFiles = async (files: FileList | null) => {
  if (!files || files.length === 0) return
  
  fileSelected.value = true
  vibrate('tap')

  for (const file of Array.from(files)) {
    try {
      const { processFile } = useFileProcessor()
      const processed = await processFile(file)
      addToQueue(processed)
    } catch (e) {
      console.error('Failed to process file:', e)
    }
  }
  showMenu.value = false
}

// Detection for camera cancellation
const watchForCancel = () => {
  fileSelected.value = false
  
  const onFocus = () => {
    // Wait a bit for the 'change' event to potentially fire first
    setTimeout(() => {
      if (!fileSelected.value && !hasSeenTooltip.value) {
        showTooltip.value = true
        hasSeenTooltip.value = true
        
        // Auto-hide tooltip after 5 seconds
        setTimeout(() => {
          showTooltip.value = false
        }, 5000)
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

const openMenu = () => {
  vibrate('tap')
  showMenu.value = true
  showTooltip.value = false // Hide tooltip if they actually found the menu
}

// Long Press Logic
onLongPress(captureBtn, openMenu, { delay: 600 })

const menuItems = [
  {
    label: 'Take Photo',
    icon: 'i-heroicons-camera',
    click: () => {
      showMenu.value = false
      openCamera()
    }
  },
  {
    label: 'Photo Library',
    icon: 'i-heroicons-photo',
    click: () => {
      showMenu.value = false
      libraryInput.value?.click()
    }
  },
  {
    label: 'Choose File',
    description: 'Upload PDFs or multiple images',
    icon: 'i-heroicons-document-plus',
    click: () => {
      showMenu.value = false
      fileInput.value?.click()
    }
  }
]
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
        ref="libraryInput"
        type="file"
        accept="image/*"
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
        Long-press the button to upload PDFs or images from your gallery.
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

    <!-- Options Slideover (Mobile Bottom Sheet) -->
    <USlideover v-model:open="showMenu" side="bottom" title="Capture Options">
      <template #content>
        <div class="p-4 flex flex-col gap-2">
          <button
            v-for="item in menuItems"
            :key="item.label"
            @click="item.click"
            class="flex items-center gap-4 w-full p-4 rounded-2xl active:bg-neutral-100 text-left transition-colors"
          >
            <div class="flex items-center justify-center h-12 w-12 rounded-xl bg-neutral-100 text-neutral-600">
              <UIcon :name="item.icon" class="h-6 w-6" />
            </div>
            <div>
              <div class="font-semibold text-neutral-900">{{ item.label }}</div>
              <div v-if="item.description" class="text-xs text-neutral-500">{{ item.description }}</div>
            </div>
          </button>
        </div>
      </template>
    </USlideover>
  </div>
</template>

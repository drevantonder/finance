<script setup lang="ts">
 const { addToQueue } = useUploadQueue()
 const { vibrate } = useNotifications()
 
 const fileInput = ref<HTMLInputElement | null>(null)
 const cameraInput = ref<HTMLInputElement | null>(null)
 const libraryInput = ref<HTMLInputElement | null>(null)
 
 const handleFiles = async (files: FileList | null) => {
   if (!files || files.length === 0) return
   
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
 }

// Long press logic
const timer = ref<NodeJS.Timeout | null>(null)
const isLongPress = ref(false)
const showMenu = ref(false)

const startPress = () => {
  isLongPress.value = false
  timer.value = setTimeout(() => {
    isLongPress.value = true
    showMenu.value = true
    vibrate('tap')
  }, 500)
}

const endPress = (e: PointerEvent) => {
  if (timer.value) {
    clearTimeout(timer.value)
    timer.value = null
  }
  
  if (!isLongPress.value) {
    // Regular tap -> trigger camera
    cameraInput.value?.click()
  }
}

const menuItems = [
  [
    {
      label: 'Take Photo',
      icon: 'i-heroicons-camera',
      click: () => cameraInput.value?.click()
    },
    {
      label: 'Photo Library',
      icon: 'i-heroicons-photo',
      click: () => libraryInput.value?.click()
    },
    {
      label: 'Choose File',
      icon: 'i-heroicons-document-plus',
      click: () => fileInput.value?.click()
    }
  ]
]
</script>

<template>
  <div class="relative">
    <!-- Hidden Inputs -->
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="e => handleFiles((e.target as HTMLInputElement).files)"
    >
    <input
      ref="libraryInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="e => handleFiles((e.target as HTMLInputElement).files)"
    >
    <input
      ref="fileInput"
      type="file"
      accept="image/*,application/pdf"
      multiple
      class="hidden"
      @change="e => handleFiles((e.target as HTMLInputElement).files)"
    >

    <!-- Trigger Button -->
    <div class="flex flex-col items-center gap-1 min-w-[64px]">
      <UDropdownMenu
        v-model:open="showMenu"
        :items="menuItems"
        :content="{ side: 'top', align: 'center', sideOffset: 8 }"
      >
        <button
          @pointerdown="startPress"
          @pointerup="endPress"
          @contextmenu.prevent
          class="h-14 w-14 -mt-6 flex items-center justify-center rounded-full transition-all active:scale-95 shadow-lg bg-primary-600 text-white"
        >
          <UIcon name="i-heroicons-camera" class="h-7 w-7" />
        </button>
      </UDropdownMenu>
      <span class="text-[10px] font-bold uppercase tracking-wider text-primary-600">Capture</span>
    </div>
  </div>
</template>

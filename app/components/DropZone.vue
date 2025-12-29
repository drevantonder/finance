<script setup lang="ts">
const isDragging = ref(false)
const dragCounter = ref(0) // Handle nested dragenter/dragleave

const emit = defineEmits<{
  (e: 'files-dropped', files: FileList): void
}>()

const onDragEnter = (e: DragEvent) => {
  e.preventDefault()
  dragCounter.value++
  if (dragCounter.value === 1) {
    isDragging.value = true
  }
}

const onDragLeave = (e: DragEvent) => {
  e.preventDefault()
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

const onDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  dragCounter.value = 0
  
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    emit('files-dropped', e.dataTransfer.files)
  }
}

// Global listeners for desktop
onMounted(() => {
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('drop', onDrop)
})

onUnmounted(() => {
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('drop', onDrop)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isDragging"
      class="fixed inset-0 z-[100] bg-primary-500/10 dark:bg-primary-500/20 backdrop-blur-[2px] pointer-events-none"
    >
      <div class="absolute inset-8 border-4 border-dashed border-primary-500 rounded-3xl flex flex-col items-center justify-center bg-white/80 dark:bg-neutral-900/80 shadow-2xl">
        <div class="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-6 animate-bounce">
          <UIcon name="i-heroicons-document-arrow-up" class="w-12 h-12 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="text-2xl font-black text-neutral-900 dark:text-white">Drop receipts to upload</h2>
        <p class="text-neutral-500 dark:text-neutral-400 mt-2">Images and PDFs are supported</p>
      </div>
    </div>
  </Transition>
</template>

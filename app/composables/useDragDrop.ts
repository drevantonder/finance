/**
 * Composable for coordinating global drag & drop state
 * Used by DropZone.vue and other components that need to react to drag events
 */
export function useDragDrop() {
  // Global drag state - shared across all consumers
  const isDragging = ref(false)
  const dragCounter = ref(0)

  // Check if we're on a touch device (no drag & drop)
  const isTouchDevice = ref(false)

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

  const resetDrag = () => {
    isDragging.value = false
    dragCounter.value = 0
  }

  const setupGlobalListeners = () => {
    if (import.meta.client) {
      // Detect touch device
      isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      // Only setup drag listeners on non-touch devices
      if (!isTouchDevice.value) {
        window.addEventListener('dragenter', onDragEnter)
        window.addEventListener('dragleave', onDragLeave)
        window.addEventListener('dragover', onDragOver)
      }
    }
  }

  const cleanupListeners = () => {
    if (import.meta.client && !isTouchDevice.value) {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
    }
  }

  return {
    isDragging: readonly(isDragging),
    isTouchDevice: readonly(isTouchDevice),
    resetDrag,
    setupGlobalListeners,
    cleanupListeners
  }
}

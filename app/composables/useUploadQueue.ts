import { defineStore } from 'pinia'
import { set, get, del } from 'idb-keyval'
import { useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/types/queries'
import type { ProcessedFile } from './useFileProcessor'

export interface QueueItem {
  id: string
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error'
  file: ProcessedFile
  capturedAt: string
  error?: string
  errorType?: 'network' | 'server' | 'validation' | 'duplicate'
  retryCount: number
  lastAttempt?: string
  createdAt: string
  result?: { merchant?: string; total?: number; id?: number }
}

const IDB_KEY = 'upload_queue'

export const useUploadQueue = defineStore('uploadQueue', () => {
  const queue = ref<QueueItem[]>([])
  const isProcessing = ref(false)
  const isOnline = useOnline()
    const toast = useToast()
    const queryClient = useQueryClient()
    const { logPipeline, logError } = useActivityLogger()

    // Load from IndexedDB on init
  const init = async () => {
    const saved = await get<QueueItem[]>(IDB_KEY)
    if (saved) {
      // Resume any stuck 'uploading' states to 'queued'
      queue.value = saved.map(item => 
        item.status === 'uploading' ? { ...item, status: 'queued' as const } : item
      )
    }
  }

  // Persist to IndexedDB
  watch(queue, async (newQueue) => {
    await set(IDB_KEY, JSON.parse(JSON.stringify(newQueue)))
  }, { deep: true })

  const addToQueue = (file: ProcessedFile) => {
    const id = crypto.randomUUID()
    const item: QueueItem = {
      id,
      status: 'queued',
      file,
      capturedAt: file.capturedAt,
      retryCount: 0,
      createdAt: new Date().toISOString()
    }
    queue.value.push(item)
    
    // Auto-start processing if online
    if (isOnline.value) {
      processQueue()
    }
    
    return id
  }

  const removeItem = async (id: string) => {
    queue.value = queue.value.filter(i => i.id !== id)
  }

  const retryItem = (id: string) => {
    const item = queue.value.find(i => i.id === id)
    if (item) {
      item.status = 'queued'
      item.retryCount = 0
      item.error = undefined
      processQueue()
    }
  }

  const clearCompleted = () => {
    queue.value = queue.value.filter(i => i.status !== 'complete')
  }

  const processQueue = async () => {
    if (isProcessing.value || !isOnline.value) return
    
    const nextItem = queue.value.find(i => i.status === 'queued')
    if (!nextItem) {
      isProcessing.value = false
      return
    }

    isProcessing.value = true
    nextItem.status = 'uploading'
    nextItem.lastAttempt = new Date().toISOString()

    try {
      // Check for duplicate image BEFORE uploading
      const startDedupe = performance.now()
      const { exists } = await $fetch<{ exists: boolean }>(`/api/expenses/check-hash?hash=${nextItem.file.hash}`)
      const dedupeDuration = Math.round(performance.now() - startDedupe)

      if (exists) {
        logPipeline({
          message: 'Upload cancelled: Duplicate detected',
          correlationId: nextItem.file.correlationId,
          level: 'warn',
          stage: 'client_dedupe',
          durationMs: dedupeDuration,
          metadata: { hash: nextItem.file.hash }
        })
        nextItem.status = 'error'
        nextItem.errorType = 'duplicate'
        nextItem.error = 'This image has already been uploaded'
        toast.add({ 
          title: 'Duplicate detected', 
          description: 'This receipt image was already uploaded',
          color: 'warning' 
        })
        isProcessing.value = false
        setTimeout(processQueue, 500)
        return
      }

      // Upload the file
      const startUpload = performance.now()
      const response = await $fetch('/api/expenses', {
        method: 'POST',
        body: {
          image: nextItem.file.data,
          capturedAt: nextItem.capturedAt,
          imageHash: nextItem.file.hash,
          correlationId: nextItem.file.correlationId,
          timing: nextItem.file.timing
        }
      })
      const uploadDuration = Math.round(performance.now() - startUpload)

      const expenseId = (response as any).id
      
      logPipeline({
        message: 'File uploaded and server processing started',
        correlationId: nextItem.file.correlationId,
        level: 'success',
        stage: 'upload',
        durationMs: uploadDuration,
        expenseId,
        metadata: {
          fileSize: nextItem.file.size,
          fileName: nextItem.file.originalName,
          cropApplied: nextItem.file.cropApplied,
          clientTiming: nextItem.file.timing
        }
      })
      
      // Update status to processing (AI is running in background)
      nextItem.status = 'processing'
      nextItem.result = {
        id: expenseId
      }

      // Refresh the expense list to show the pending item
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      
      // Auto-remove from queue after a short delay so user sees "Analyzing" status
      setTimeout(() => {
        removeItem(nextItem.id)
      }, 5000)
    } catch (e: any) {
      logError(`Upload failed: ${nextItem.file.originalName}`, e, {
        correlationId: nextItem.file.correlationId,
        id: nextItem.id,
        retryCount: nextItem.retryCount
      })
      nextItem.status = 'error'
      nextItem.error = e.statusMessage || e.message || 'Unknown error'
      nextItem.retryCount++
      
      // Automatic retry logic (max 3 times per session)
      if (nextItem.retryCount < 3) {
        setTimeout(() => {
          nextItem.status = 'queued'
          processQueue()
        }, Math.pow(2, nextItem.retryCount) * 1000)
      }
    } finally {
      isProcessing.value = false
      // Move to next item after a short delay
      setTimeout(processQueue, 500)
    }
  }

  // Watch for online status to resume processing
  watch(isOnline, (online) => {
    if (online) processQueue()
  })

  return {
    queue,
    isProcessing,
    init,
    addToQueue,
    removeItem,
    retryItem,
    clearCompleted,
    processQueue,
    
    // Computed arrays for UI
    queuedItems: computed(() => queue.value.filter(i => i.status === 'queued')),
    uploadingItems: computed(() => queue.value.filter(i => i.status === 'uploading')),
    processingItems: computed(() => queue.value.filter(i => i.status === 'processing')),
    errorItems: computed(() => queue.value.filter(i => i.status === 'error')),
    completedItems: computed(() => queue.value.filter(i => i.status === 'complete')),
    
    // Counts
    queuedCount: computed(() => queue.value.filter(i => i.status === 'queued').length),
    uploadingCount: computed(() => queue.value.filter(i => i.status === 'uploading').length),
    processingCount: computed(() => queue.value.filter(i => i.status === 'processing').length),
    errorCount: computed(() => queue.value.filter(i => i.status === 'error').length),
    completedCount: computed(() => queue.value.filter(i => i.status === 'complete').length),
    
    // Boolean helpers
    hasQueued: computed(() => queue.value.some(i => i.status === 'queued' || i.status === 'uploading')),
    hasErrors: computed(() => queue.value.some(i => i.status === 'error'))
  }
})

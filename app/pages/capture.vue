<script setup lang="ts">
import type { Expense } from '~/types'

definePageMeta({
  layout: 'default',
  hideNav: true
})

const router = useRouter()
const toast = useToast()
const pendingUploads = ref(0)
const successCount = ref(0)
const lastCapture = ref<Expense | null>(null)
const captureComponent = ref<any>(null)

async function handleCaptured(data: { image: string, capturedAt: string, imageHash: string }) {
  const { image, capturedAt, imageHash } = data
  pendingUploads.value++
  
  try {
    const newExpense = await $fetch<Expense>('/api/expenses', {
      method: 'POST',
      body: { image, capturedAt, imageHash }
    })
    successCount.value++
    lastCapture.value = newExpense
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  } catch (err) {
    toast.add({ title: 'Upload failed', color: 'error' })
  } finally {
    pendingUploads.value--
  }
}

function done() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

function scanAnother() {
  successCount.value = 0
  lastCapture.value = null
}
</script>

<template>
  <div class="fixed inset-0 z-[60] bg-black flex flex-col">
    <!-- Header -->
    <div class="flex justify-between items-center p-4">
      <UButton
        icon="i-heroicons-x-mark"
        color="neutral"
        variant="ghost"
        size="xl"
        square
        @click="done"
      />
      <div v-if="successCount > 0" class="text-white text-sm font-bold bg-white/10 px-3 py-1 rounded-full">
        {{ successCount }} captured
      </div>
      <div v-else class="text-white/60 text-sm font-medium">
        Capture Receipt
      </div>
      <div class="w-12"></div> <!-- Spacer for centering -->
    </div>

    <!-- Main View -->
    <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
      
      <!-- Uploading State -->
      <div v-if="pendingUploads > 0" class="space-y-6">
        <div class="relative w-32 h-32 mx-auto flex items-center justify-center">
          <div class="absolute inset-0 border-4 border-primary-500 rounded-full animate-ping opacity-25"></div>
          <div class="relative w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center shadow-2xl">
            <UIcon name="i-heroicons-cloud-arrow-up" class="w-12 h-12 text-white" />
          </div>
        </div>
        <div class="space-y-1">
          <h3 class="text-xl font-bold text-white">Uploading...</h3>
          <p class="text-white/40 text-sm">Processing with AI</p>
        </div>
      </div>

      <!-- Success State -->
      <div v-else-if="successCount > 0" class="space-y-10 w-full max-w-sm">
        <div class="space-y-4">
          <div class="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 scale-110">
            <UIcon name="i-heroicons-check" class="w-14 h-14 text-white" />
          </div>
          <div>
            <h2 class="text-3xl font-black text-white mb-2 tracking-tight">Got it!</h2>
            <p class="text-white/60 font-medium">
              {{ lastCapture?.merchant || 'Receipt' }} saved
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <UButton
            size="xl"
            block
            color="primary"
            class="py-4 text-lg font-bold rounded-2xl"
            label="Scan Another"
            icon="i-heroicons-camera"
            @click="scanAnother"
          />
          <UButton
            size="xl"
            block
            variant="ghost"
            color="neutral"
            class="py-4 text-lg font-bold rounded-2xl text-white"
            label="Done"
            @click="done"
          />
        </div>
      </div>

      <!-- Initial State -->
      <div v-else class="w-full h-full flex flex-col items-center justify-center space-y-10">
        <div 
          class="w-full aspect-square max-w-sm bg-white/5 border-2 border-dashed border-white/20 rounded-[40px] flex flex-col items-center justify-center gap-6 cursor-pointer active:bg-white/10 transition-all hover:border-primary-500/50 group"
          @click="captureComponent?.triggerCamera()"
        >
          <div class="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
            <UIcon name="i-heroicons-camera" class="w-12 h-12 text-white" />
          </div>
          <div class="space-y-2">
            <p class="text-white text-2xl font-black tracking-tight">Tap to Snap</p>
            <p class="text-white/40 font-medium">Photos or PDFs</p>
          </div>
        </div>

        <p class="text-white/20 text-xs uppercase tracking-[0.2em] font-bold">
          AI Receipt Processing
        </p>
        
        <div class="hidden">
          <ReceiptCapture ref="captureComponent" @captured="handleCaptured" />
        </div>
      </div>
    </div>
  </div>
</template>

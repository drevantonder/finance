<script setup lang="ts">
 const fileInput = ref<HTMLInputElement | null>(null)
 const { vibrate } = useNotifications()
 
 defineProps<{
   collapsed?: boolean
 }>()
 
 const handleFiles = async (files: FileList | null) => {
   if (!files || files.length === 0) return
 
   for (const file of Array.from(files)) {
     try {
       const { processFile } = useFileProcessor()
       const { addToQueue } = useUploadQueue()
       const processed = await processFile(file)
       addToQueue(processed)
     } catch (e) {
       console.error('Failed to process file:', e)
     }
   }
 }
</script>

<template>
  <div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*,application/pdf"
      multiple
      class="hidden"
      @change="e => handleFiles((e.target as HTMLInputElement).files)"
    >
    
    <button
      type="button"
      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50 text-gray-700 hover:text-primary-700"
      title="Upload Receipt"
      @click="fileInput?.click()"
    >
      <UIcon name="i-heroicons-arrow-up-tray" class="h-6 w-6 flex-shrink-0 text-gray-500 group-hover:text-primary-600" />
      <span v-if="!collapsed" class="truncate font-semibold">Upload Receipt</span>
    </button>
  </div>
</template>


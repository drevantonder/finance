<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits(['update:open'])

// Local computed for v-model binding
const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

// Use a simple media query for mobile detection
const isMobile = ref(false)

onMounted(() => {
  const mediaQuery = window.matchMedia('(max-width: 768px)')
  isMobile.value = mediaQuery.matches
  mediaQuery.addEventListener('change', (e) => isMobile.value = e.matches)
})
</script>

<template>
   <template v-if="isMobile">
     <UDrawer v-model:open="isOpen">
       <template #content>
         <div class="h-[80vh] flex flex-col">
           <div class="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
             <h2 class="font-bold">Upload Queue</h2>
             <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" @click="isOpen = false" />
           </div>
           <div class="flex-grow overflow-hidden">
             <QueueContent />
           </div>
         </div>
       </template>
     </UDrawer>
   </template>
   
     <template v-else>
        <USlideover v-model:open="isOpen" title="Upload Queue" description="View and manage your upload queue">
         <template #content>
           <div class="flex flex-col h-full">
             <div class="flex-grow overflow-hidden">
               <QueueContent />
             </div>
           </div>
         </template>
       </USlideover>
     </template>
</template>

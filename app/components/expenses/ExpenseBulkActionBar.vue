<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  selectedCount: number
}>()

const emit = defineEmits<{
  (e: 'clear'): void
  (e: 'delete'): void
  (e: 'reprocess'): void
  (e: 'select-duplicates'): void
}>()

const isConfirmingDelete = ref(false)

function handleDelete() {
  if (isConfirmingDelete.value) {
    emit('delete')
    isConfirmingDelete.value = false
  } else {
    isConfirmingDelete.value = true
  }
}

function cancelDelete() {
  isConfirmingDelete.value = false
}
</script>

<template>
  <div class="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gray-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in ring-1 ring-black/5">
    
    <!-- Counter -->
    <div class="flex items-center px-4 border-r border-gray-100 mr-1 h-8">
      <span class="text-sm font-bold text-gray-900 tabular-nums">{{ selectedCount }}</span>
      <span class="ml-1.5 text-xs font-medium text-gray-500">selected</span>
    </div>

    <!-- Actions -->
    <template v-if="!isConfirmingDelete">
      <UTooltip text="Reprocess Selected">
        <UButton 
          variant="ghost" 
          color="neutral" 
          icon="i-heroicons-arrow-path" 
          size="sm" 
          class="rounded-full w-9 h-9 flex items-center justify-center hover:bg-gray-100" 
          @click="emit('reprocess')" 
        />
      </UTooltip>

      <UTooltip text="Select Duplicates">
        <UButton 
          variant="ghost" 
          color="warning" 
          icon="i-heroicons-document-duplicate" 
          size="sm" 
          class="rounded-full w-9 h-9 flex items-center justify-center hover:bg-warning-50 text-warning-600" 
          @click="emit('select-duplicates')" 
        />
      </UTooltip>

      <UTooltip text="Delete Selected">
        <UButton 
          variant="ghost" 
          color="error" 
          icon="i-heroicons-trash" 
          size="sm" 
          class="rounded-full w-9 h-9 flex items-center justify-center hover:bg-error-50 text-error-600" 
          @click="handleDelete" 
        />
      </UTooltip>
    </template>

    <!-- Confirmation State -->
    <template v-else>
      <div class="flex items-center gap-1 px-1">
        <UButton 
          color="error" 
          size="xs" 
          class="rounded-full px-4"
          @click="handleDelete"
        >
          Confirm Delete
        </UButton>
        <UButton 
          variant="ghost" 
          color="neutral" 
          size="xs" 
          class="rounded-full w-8 h-8 p-0"
          icon="i-heroicons-x-mark"
          @click="cancelDelete" 
        />
      </div>
    </template>

    <!-- Clear -->
    <div class="ml-1 pl-1 border-l border-gray-100" v-if="!isConfirmingDelete">
      <UButton 
        variant="ghost" 
        color="neutral" 
        icon="i-heroicons-x-mark" 
        size="xs" 
        class="rounded-full w-8 h-8 p-0" 
        @click="emit('clear')" 
      />
    </div>
  </div>
</template>

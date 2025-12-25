<script setup lang="ts">
import { useTimeAgo } from '@vueuse/core'
import { useQueryClient } from '@tanstack/vue-query'
import { useRealtimeSync } from '~/composables/useRealtimeSync'

const queryClient = useQueryClient()
const store = useSessionStore()
const { isConnected } = useRealtimeSync()

const isFetching = computed(() => queryClient.isFetching() > 0 || store.isLoading)
const isMutating = computed(() => queryClient.isMutating() > 0 || store.isSyncing)

const statusConfig = computed(() => {
  if (isMutating.value || isFetching.value) {
    return { 
      icon: 'i-heroicons-arrow-path', 
      color: 'text-primary-500', 
      class: 'animate-spin',
      label: 'Syncing...'
    }
  }
  
  if (!isConnected.value) {
    return { 
      icon: 'i-heroicons-no-symbol', 
      color: 'text-gray-400', 
      class: '',
      label: 'Disconnected'
    }
  }

  return { 
    icon: 'i-heroicons-cloud', 
    color: 'text-gray-400', 
    class: '',
    label: 'Synced'
  }
})

function forceRefresh() {
  queryClient.invalidateQueries()
}
</script>

<template>
  <div class="flex items-center gap-2">
    <UPopover mode="hover" :popper="{ placement: 'bottom-end' }">
      <div class="relative">
        <UButton
          :icon="statusConfig.icon"
          variant="ghost"
          :class="[statusConfig.color, statusConfig.class]"
          square
          size="sm"
        />
      </div>

      <template #content>
      <div class="p-3 text-xs w-48">
        <p class="font-medium mb-1 flex items-center gap-2">
          <UIcon :name="statusConfig.icon" :class="statusConfig.color" />
          {{ statusConfig.label }}
        </p>
        
          <UButton 
            size="xs" 
            variant="soft" 
            class="mt-2 w-full"
            :loading="isFetching"
            @click="forceRefresh"
          >
            Sync Now
          </UButton>

          <div class="mt-3 pt-3 border-t border-gray-100">
            <UButton
              to="/activity"
              size="xs"
              color="neutral"
              variant="ghost"
              class="w-full justify-between"
              icon="i-heroicons-bolt"
            >
              View Activity
              <UIcon name="i-heroicons-chevron-right" />
            </UButton>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>

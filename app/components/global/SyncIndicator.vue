<script setup lang="ts">
import { useTimeAgo } from '@vueuse/core'

const store = useSessionStore()
const { sync } = store

const statusConfig = computed(() => {
  // Pinia store properties are unwrapped when accessed via the store instance
  const s = store.sync.status
  switch (s) {
    case 'syncing':
      return { 
        icon: 'i-heroicons-arrow-path-20-solid', 
        color: 'text-primary-500', 
        class: 'animate-spin',
        label: 'Syncing...'
      }
    case 'pending':
      return { 
        icon: 'i-heroicons-cloud-arrow-up-20-solid', 
        color: 'text-amber-500', 
        class: '',
        label: 'Offline (Changes pending)'
      }
    case 'offline':
      return { 
        icon: 'i-heroicons-cloud-slash-20-solid', 
        color: 'text-gray-400', 
        class: '',
        label: 'Offline'
      }
    case 'error':
      return { 
        icon: 'i-heroicons-exclamation-circle-20-solid', 
        color: 'text-red-500', 
        class: '',
        label: 'Sync Error'
      }
    default: // synced
      return { 
        icon: 'i-heroicons-cloud-20-solid', 
        color: 'text-gray-400', 
        class: '',
        label: 'Synced'
      }
  }
})

const timeAgo = useTimeAgo(computed(() => store.sync.lastSyncedAt ? new Date(store.sync.lastSyncedAt) : new Date()))
const { logs } = useLogger()
const hasUnreadErrors = computed(() => logs.value.some(l => l.level === 'error' && new Date(l.createdAt).getTime() > Date.now() - 3600000))
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
        <span v-if="hasUnreadErrors" class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
      </div>

      <template #content>
      <div class="p-3 text-xs w-48">
        <p class="font-medium mb-1 flex items-center gap-2">
          <UIcon :name="statusConfig.icon" :class="statusConfig.color" />
          {{ statusConfig.label }}
        </p>
        
        <p v-if="store.sync.error" class="text-red-500 mb-2 italic">
          {{ store.sync.error }}
        </p>
        
        <p class="text-gray-500">
          Last synced: {{ store.sync.lastSyncedAt ? timeAgo : 'Never' }}
        </p>
        
          <UButton 
            v-if="store.sync.status === 'error' || store.sync.status === 'offline' || store.sync.status === 'pending'"
            size="xs" 
            variant="soft" 
            class="mt-2 w-full"
            @click="store.sync.pull()"
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

<script setup lang="ts">
import type { ActivityLog, ActivityLogLevel } from '~/types'

const props = defineProps<{
  entry: ActivityLog
}>()

const statusColors: Record<ActivityLogLevel, string> = {
  info: 'border-info-500',
  success: 'border-success-500',
  warn: 'border-warning-500',
  error: 'border-error-500'
}

const statusIcons: Record<ActivityLogLevel, string> = {
  info: 'i-heroicons-information-circle',
  success: 'i-heroicons-check-circle',
  warn: 'i-heroicons-exclamation-triangle',
  error: 'i-heroicons-x-circle'
}

const entryIcon = computed(() => {
  if (props.entry.stage === 'startup') return 'i-heroicons-rocket-launch'
  return statusIcons[props.entry.level]
})

const formatTime = (date: Date | string) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString()
}

const parsedMetadata = computed(() => {
  if (!props.entry.metadata) return null
  if (typeof props.entry.metadata === 'string') {
    try {
      return JSON.parse(props.entry.metadata)
    } catch {
      return props.entry.metadata
    }
  }
  return props.entry.metadata
})

const stages = computed(() => {
  if (props.entry.stage === 'startup' && parsedMetadata.value) {
    const m = parsedMetadata.value
    return {
      'ttfb': m.ttfb,
      'dom-interactive': m.domInteractive,
      'dom-complete': m.domComplete,
      'nuxt-mount': m.nuxtMountMs,
      'session-load': m.sessionLoadMs,
      'sse-connect': m.sseConnectMs,
      'fcp': m.fcp,
      'lcp': m.lcp
    }
  }
  return parsedMetadata.value?.stages || null
})
</script>

<template>
  <div class="flex gap-4 group">
    <!-- Timestamp Column -->
    <div class="flex flex-col items-end w-20 pt-1 shrink-0">
      <span class="text-xs font-mono text-neutral-500">
        {{ formatTime(entry.createdAt) }}
      </span>
      <span class="text-[10px] text-neutral-400">
        {{ formatDate(entry.createdAt) }}
      </span>
    </div>

    <!-- Timeline Line -->
    <div class="relative flex flex-col items-center shrink-0">
      <div 
        class="w-2.5 h-2.5 rounded-full border-2 bg-white z-10 transition-colors"
        :class="statusColors[entry.level]"
      ></div>
      <div class="w-px h-full bg-neutral-100 group-last:hidden -mt-1"></div>
    </div>

    <!-- Content Card -->
    <div class="flex-1 pb-8">
      <div class="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:border-neutral-200 transition-all group-hover:shadow-md">
        <div class="flex justify-between items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <UIcon :name="entryIcon" class="w-4 h-4" :class="statusColors[entry.level].replace('border-', 'text-')" />
              <p class="text-sm font-semibold text-neutral-900 leading-none">{{ entry.message }}</p>
            </div>
            
            <div class="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-wider font-medium">
              <span>{{ entry.source }}</span>
              <span v-if="entry.type !== 'system'">• {{ entry.type }}</span>
              <span v-if="entry.stage">• {{ entry.stage }}</span>
              <span v-if="entry.durationMs">• {{ (entry.durationMs / 1000).toFixed(2) }}s</span>
            </div>

            <!-- Pipeline Timing Bars -->
            <div v-if="stages" class="mt-3 space-y-1">
              <div v-for="(duration, name) in stages" :key="name" class="flex items-center gap-2">
                <div class="text-[9px] font-mono text-neutral-400 w-16 truncate uppercase">{{ name }}</div>
                <div class="flex-1 h-1 bg-neutral-50 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-info-400 opacity-60" 
                    :style="{ width: `${Math.min(100, (duration / (entry.durationMs || 10000)) * 100)}%` }"
                  ></div>
                </div>
                <div class="text-[9px] font-mono text-neutral-500 w-10 text-right">{{ duration }}ms</div>
              </div>
            </div>
          </div>
          
          <UPopover v-if="parsedMetadata">
            <UButton 
              color="neutral" 
              variant="ghost" 
              size="xs" 
              label="Details"
              icon="i-heroicons-code-bracket"
            />
            <template #content>
              <div class="p-3 max-w-sm max-h-96 overflow-auto">
                <pre class="text-[10px] font-mono text-neutral-700 whitespace-pre-wrap bg-neutral-50 p-2 rounded border border-neutral-100">{{ JSON.stringify(parsedMetadata, null, 2) }}</pre>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface WaterfallEntry {
  name: string
  duration: number
  startTime: number
  type?: 'fetch' | 'script' | 'stylesheet' | 'image' | 'font' | 'wasm' | 'other' | 'component' | 'milestone'
  cached?: boolean
  size?: number
}

interface Props {
  entries: WaterfallEntry[]
  maxTime?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxTime: undefined
})

// Tooltip state
const hoveredEntry = ref<WaterfallEntry | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })

// Calculate dimensions
const maxDuration = computed(() => {
  const entryMax = Math.max(...props.entries.map(e => e.startTime + e.duration))
  return props.maxTime || Math.ceil(entryMax / 100) * 100
})

const barHeight = 24
const barGap = 4
const totalHeight = computed(() => props.entries.length * (barHeight + barGap))

// Color mapping
const getColor = (type: string) => {
  const colors: Record<string, string> = {
    fetch: '#3b82f6',
    script: '#eab308',
    stylesheet: '#8b5cf6',
    image: '#ec4899',
    font: '#14b8a6',
    wasm: '#f97316',
    component: '#22c55e',
    milestone: '#ef4444',
    other: '#9ca3af'
  }
  return colors[type] || colors.other
}

// Handle hover events
const handleMouseEnter = (entry: WaterfallEntry, event: MouseEvent) => {
  hoveredEntry.value = entry
  tooltipPosition.value = { x: event.clientX, y: event.clientY }
}

const handleMouseLeave = () => {
  hoveredEntry.value = null
}

// Calculate position for tooltip
const tooltipStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${tooltipPosition.value.x + 10}px`,
  top: `${tooltipPosition.value.y + 10}px`,
  zIndex: 9999
}))

// Format size
const formatSize = (bytes?: number) => {
  if (!bytes) return '-'
  if (bytes === 0) return 'cached'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <div class="waterfall-chart relative">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-2 text-xs text-neutral-500">
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded" style="background: #3b82f6" />
        <span>Fetch</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded" style="background: #eab308" />
        <span>Script</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded" style="background: #22c55e" />
        <span>Component</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded" style="background: #ef4444" />
        <span>Milestone</span>
      </div>
      <div class="ml-auto">{{ entries.length }} entries</div>
    </div>

    <!-- Chart container with scroll for small screens -->
    <div class="overflow-x-auto">
      <div class="min-w-full">
        <!-- Time scale -->
        <div class="relative h-6 border-b border-neutral-200 mb-1">
          <svg
            :width="`${maxDuration}px`"
            height="24"
            class="block"
          >
            <text
              v-for="i in 10"
              :key="i"
              :x="(maxDuration / 10) * (i - 1)"
              y="16"
              font-size="10"
              fill="#737373"
            >
              {{ Math.round((maxDuration / 10) * (i - 1)) }}ms
            </text>
          </svg>
        </div>

        <!-- Waterfall bars -->
        <div class="relative" :style="{ height: `${totalHeight}px` }">
          <svg
            :width="`${maxDuration}px`"
            :height="totalHeight"
            class="block"
          >
            <g
              v-for="(entry, index) in entries"
              :key="index"
              @mouseenter="handleMouseEnter(entry, $event)"
              @mouseleave="handleMouseLeave"
            >
              <!-- Bar -->
              <rect
                :x="entry.startTime"
                :y="index * (barHeight + barGap)"
                :width="Math.max(entry.duration, 2)"
                :height="barHeight"
                :fill="getColor(entry.type || 'other')"
                :opacity="entry.cached ? 0.6 : 1"
                rx="2"
                class="cursor-pointer hover:opacity-80 transition-opacity"
              />

              <!-- Label -->
              <text
                :x="entry.startTime + 4"
                :y="index * (barHeight + barGap) + 16"
                :font-size="11"
                fill="white"
                class="pointer-events-none"
              >
                {{
                  entry.name.length > 20
                    ? entry.name.slice(0, 20) + '...'
                    : entry.name
                }}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="hoveredEntry"
        :style="tooltipStyle"
        class="bg-neutral-900 text-white text-xs rounded-lg p-3 shadow-lg pointer-events-none min-w-48"
      >
        <div class="font-bold mb-2 truncate">{{ hoveredEntry.name }}</div>
        <div class="space-y-1">
          <div class="flex justify-between gap-4">
            <span class="text-neutral-400">Duration:</span>
            <span class="font-mono">{{ Math.round(hoveredEntry.duration) }}ms</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-neutral-400">Start:</span>
            <span class="font-mono">{{ Math.round(hoveredEntry.startTime) }}ms</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-neutral-400">Type:</span>
            <span class="capitalize">{{ hoveredEntry.type || 'other' }}</span>
          </div>
          <div v-if="hoveredEntry.cached !== undefined" class="flex justify-between gap-4">
            <span class="text-neutral-400">Cached:</span>
            <span>{{ hoveredEntry.cached ? 'Yes' : 'No' }}</span>
          </div>
          <div v-if="hoveredEntry.size !== undefined" class="flex justify-between gap-4">
            <span class="text-neutral-400">Size:</span>
            <span class="font-mono">{{ formatSize(hoveredEntry.size) }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

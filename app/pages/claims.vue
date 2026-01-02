<script setup lang="ts">
import { ref, computed } from 'vue'
import { useExpenseClaimsQuery, useBulkExpenseClaimMutation, useExpenseClaimMutation, useCreateClaimMutation } from '~/composables/queries'
import { PTC_CATEGORIES } from '~/utils/ptcCategories'
import { formatCurrency } from '~/composables/useFormatter'

const { data: unclaimedRows, isLoading } = useExpenseClaimsQuery('pending')
const { mutateAsync: bulkAction } = useBulkExpenseClaimMutation()
const { mutateAsync: updateClaim } = useExpenseClaimMutation()

// Sort by oldest first (most urgent - closest to 12mo expiry)
const sortedRows = computed(() => {
  if (!unclaimedRows.value) return []
  return [...unclaimedRows.value].sort((a, b) => {
    const dateA = new Date(a.expense.date || a.expense.capturedAt).getTime()
    const dateB = new Date(b.expense.date || b.expense.capturedAt).getTime()
    return dateA - dateB // oldest first
  })
})

// Selection - track by expense ID since expense_claim may not exist yet
const selectedExpenseIds = ref<Set<string>>(new Set())
const isAllSelected = computed(() => 
  (sortedRows.value?.length || 0) > 0 && selectedExpenseIds.value.size === sortedRows.value?.length
)

function toggleAll() {
  if (isAllSelected.value) selectedExpenseIds.value = new Set()
  else selectedExpenseIds.value = new Set(sortedRows.value?.map(r => r.expense.id))
}

function toggleSelect(expenseId: string) {
  const newSet = new Set(selectedExpenseIds.value)
  if (newSet.has(expenseId)) newSet.delete(expenseId)
  else newSet.add(expenseId)
  selectedExpenseIds.value = newSet
}

// Archive
async function archiveSelected() {
  const expenseIds = Array.from(selectedExpenseIds.value)
  if (!expenseIds.length) return
  
  await bulkAction({ expenseIds, action: 'archive' })
  selectedExpenseIds.value = new Set()
}

// Stats
const totalUnclaimed = computed(() => 
  unclaimedRows.value?.reduce((sum, r) => sum + (r.expense.total || 0), 0) || 0
)

const daysLeft = (date: string | Date) => {
  const expiry = new Date(date)
  expiry.setFullYear(expiry.getFullYear() + 1)
  const diff = expiry.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const getUrgencyColor = (days: number) => {
  if (days < 0) return 'text-gray-400 line-through'
  if (days < 30) return 'text-error-500'
  if (days < 60) return 'text-warning-500'
  return 'text-success-500'
}

// Focus Mode / Assistant
const isAssistantOpen = ref(false)
const currentIndex = ref(0)
const selectedForClaim = computed(() => 
  sortedRows.value?.filter(r => selectedExpenseIds.value.has(r.expense.id)) || []
)

const currentItem = computed(() => selectedForClaim.value[currentIndex.value])

function startClaim() {
  if (selectedExpenseIds.value.size === 0) return
  currentIndex.value = 0
  isAssistantOpen.value = true
}

// Copy Card Refs for shortcut triggering
const cardDate = ref()
const cardProvider = ref()
const cardAmount = ref()
const cardMfb = ref()
const cardGst = ref()

// Keyboard Navigation
useEventListener('keydown', (e) => {
  if (!isAssistantOpen.value) return

  // Copy shortcuts (1-5)
  if (e.key === '1') cardDate.value?.copyToClipboard()
  if (e.key === '2') cardProvider.value?.copyToClipboard()
  if (e.key === '3') cardAmount.value?.copyToClipboard()
  if (e.key === '4') cardMfb.value?.copyToClipboard()
  if (e.key === '5') cardGst.value?.copyToClipboard()

  // Navigation
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault()
    if (currentIndex.value < selectedForClaim.value.length - 1) currentIndex.value++
  }
  if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
    e.preventDefault()
    if (currentIndex.value > 0) currentIndex.value--
  }
  if (e.key === 'Escape') isAssistantOpen.value = false
})

// Receipt Zoom State
const isZoomLocked = ref(false)
const zoomPos = ref({ x: 50, y: 50 })
const isHovering = ref(false)

function handleImageMove(e: MouseEvent) {
  if (isZoomLocked.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  zoomPos.value = {
    x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
  }
}

function toggleZoomLock() {
  isZoomLocked.value = !isZoomLocked.value
}

// Auto-scroll queue
const queueRefs = ref<HTMLElement[]>([])
watch(currentIndex, (newIdx) => {
  const el = queueRefs.value[newIdx]
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})

// Final Action
const { mutateAsync: createClaim } = useCreateClaimMutation()
const { getFinancialYear } = useDateUtils()

async function finishClaim() {
  const expenseIds = selectedForClaim.value.map(r => r.expense.id)
  
  try {
    await createClaim({ 
      id: crypto.randomUUID(),
      financialYear: getFinancialYear(),
      expenseIds,
      claimDate: new Date().toISOString(),
      notes: `Claimed via Assistant (${expenseIds.length} items)`
    })
    
    isAssistantOpen.value = false
    selectedExpenseIds.value = new Set()
  } catch (err) {
    console.error('Failed to finish claim:', err)
  }
}

const getImageUrl = (id: string) => `/api/expenses/${id}/image`
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8 pb-24 px-4">
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Claims</h1>
        <p class="text-sm text-gray-500">Manage your P2C MMR/MFB claims and track expenses.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <UButton 
          icon="i-heroicons-archive-box" 
          color="neutral" 
          variant="subtle"
          label="Archived" 
        />
        <UButton 
          icon="i-heroicons-clock" 
          color="neutral" 
          variant="subtle"
          label="History" 
        />
        <UButton 
          icon="i-heroicons-play" 
          color="primary" 
          label="Start Claim" 
          class="hidden lg:flex"
          :disabled="selectedExpenseIds.size === 0"
          @click="startClaim"
        />
      </div>
    </header>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">To Claim</span>
          <span class="text-2xl font-bold text-gray-900">{{ formatCurrency(totalUnclaimed) }}</span>
          <span class="text-xs text-gray-500 mt-1">{{ sortedRows?.length || 0 }} expenses pending</span>
        </div>
      </UCard>
      
      <UCard>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">MFB Budget</span>
          <div class="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-primary-500" style="width: 65%"></div>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-xs font-medium text-gray-500">$7,235 claimed</span>
            <span class="text-xs font-medium text-gray-900">$2,716 left</span>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Financial Year</span>
          <span class="text-xl font-bold text-gray-900 mt-1">2025-26</span>
          <span class="text-xs text-gray-500 mt-1">Ends Mar 31, 2026</span>
        </div>
      </UCard>
    </div>

    <!-- Triage List -->
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h3 class="font-bold text-gray-900">Unclaimed Expenses</h3>
            <div v-if="selectedExpenseIds.size > 0" class="flex items-center gap-2">
              <span class="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                {{ selectedExpenseIds.size }} selected
              </span>
              <UButton 
                size="xs" 
                color="neutral" 
                variant="ghost" 
                label="Archive" 
                icon="i-heroicons-archive-box"
                @click="archiveSelected"
              />
            </div>
          </div>
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="p-4 w-10">
                <UCheckbox :model-value="isAllSelected" @update:model-value="toggleAll" />
              </th>
              <th class="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expense</th>
              <th class="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">P2C Category</th>
              <th class="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-24 text-center">MFB %</th>
              <th class="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
              <th class="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Expiry</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="isLoading">
              <td colspan="6" class="p-8 text-center">
                <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin text-gray-400 mx-auto" />
              </td>
            </tr>
            <tr 
              v-else
              v-for="row in sortedRows" 
              :key="row.expense.id"
              class="hover:bg-gray-50/50 transition-colors"
              :class="{ 
                'bg-primary-50/20': selectedExpenseIds.has(row.expense.id),
                'opacity-50': daysLeft(row.expense.date || row.expense.capturedAt) < 0
              }"
            >
              <td class="p-4">
                <UCheckbox 
                  :model-value="selectedExpenseIds.has(row.expense.id)" 
                  @update:model-value="toggleSelect(row.expense.id)" 
                />
              </td>
              <td class="p-4">
                <div class="flex flex-col">
                  <span class="text-sm font-semibold text-gray-900">{{ row.expense.merchant || 'Unknown' }}</span>
                  <span class="text-xs text-gray-500">{{ new Date(row.expense.date || row.expense.capturedAt).toLocaleDateString('en-AU') }}</span>
                </div>
              </td>
              <td class="p-4">
                <div v-if="row.ptcCategory" class="text-xs font-medium text-gray-700">
                  {{ row.ptcCategory }}
                </div>
                <div v-else class="flex items-center gap-1 text-xs font-bold text-warning-600 uppercase tracking-tight">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-3.5 h-3.5" />
                  Not Linked
                </div>
              </td>
              <td class="p-4 text-center">
                <span 
                  class="text-xs font-bold px-2 py-1 rounded"
                  :class="{
                    'bg-success-50 text-success-700': (row.mfbPercent ?? 100) === 100,
                    'bg-warning-50 text-warning-700': (row.mfbPercent ?? 100) > 0 && (row.mfbPercent ?? 100) < 100,
                    'bg-gray-100 text-gray-500': (row.mfbPercent ?? 100) === 0
                  }"
                >
                  {{ row.mfbPercent ?? 100 }}%
                </span>
              </td>
              <td class="p-4 text-right">
                <span class="text-sm font-bold text-gray-900">{{ formatCurrency(row.expense.total) }}</span>
              </td>
              <td class="p-4 text-right">
                <div class="flex flex-col items-end">
                  <span class="text-xs font-bold" :class="getUrgencyColor(daysLeft(row.expense.date || row.expense.capturedAt))">
                    <template v-if="daysLeft(row.expense.date || row.expense.capturedAt) < 0">
                      Expired
                    </template>
                    <template v-else>
                      {{ daysLeft(row.expense.date || row.expense.capturedAt) }} days
                    </template>
                  </span>
                  <span class="text-[10px] text-gray-400">until 12mo limit</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="!isLoading && (!sortedRows || sortedRows.length === 0)" class="p-12 text-center text-gray-500 italic">
        No pending expenses found.
      </div>
    </UCard>

    <!-- Claim Assistant Modal -->
    <UModal 
      v-model:open="isAssistantOpen" 
      title="Claim Assistant" 
      fullscreen
      :ui="{
        content: 'flex flex-col overflow-hidden bg-white',
        body: 'p-0 flex-1 overflow-hidden flex flex-col',
        header: 'hidden'
      }"
    >
      <template #body>
        <!-- Toolbar -->
        <div class="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
          <div class="flex items-center gap-4">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="isAssistantOpen = false"
            />
            <h2 class="text-sm font-bold text-gray-900 flex items-center gap-2">
              Claim Assistant
              <span class="text-gray-400 font-normal px-2 py-0.5 bg-gray-50 rounded text-xs">
                {{ currentIndex + 1 }} of {{ selectedForClaim.length }}
              </span>
            </h2>
          </div>

          <div class="flex items-center gap-3">
            <div class="hidden lg:flex items-center gap-4 mr-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span class="flex items-center gap-1.5"><UKbd size="sm">1-5</UKbd> Copy</span>
              <span class="flex items-center gap-1.5"><UKbd size="sm">Space</UKbd> Next</span>
              <span class="flex items-center gap-1.5"><UKbd size="sm">Esc</UKbd> Close</span>
            </div>
            <UButton 
              color="primary" 
              icon="i-heroicons-check" 
              label="Finish & Mark Claimed" 
              @click="finishClaim"
            />
          </div>
        </div>

        <div class="flex-1 flex overflow-hidden">
          <!-- Column 1: Queue (240px) -->
          <aside class="w-72 border-r border-gray-100 bg-gray-50/30 flex flex-col overflow-hidden">
            <div class="p-4 border-b border-gray-100 bg-white">
              <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Queue</h3>
            </div>
            <div class="flex-1 overflow-y-auto p-3 space-y-2">
              <button 
                v-for="(row, idx) in selectedForClaim" 
                :key="row.expense.id"
                ref="queueRefs"
                class="w-full text-left p-3 rounded-xl transition-all relative group"
                :class="[
                  currentIndex === idx 
                    ? 'bg-white shadow-sm ring-1 ring-primary-500 border-transparent' 
                    : 'hover:bg-gray-100/50 border border-transparent'
                ]"
                @click="currentIndex = idx"
              >
                <div class="flex items-start gap-3">
                  <div 
                    class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    :class="currentIndex === idx ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'"
                  >
                    {{ idx + 1 }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-gray-900 truncate">{{ row.expense.merchant || 'Unknown' }}</div>
                    <div class="text-[10px] text-gray-500">{{ formatCurrency(row.expense.total) }}</div>
                  </div>
                  <div v-if="currentIndex === idx" class="text-primary-500">
                    <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
                  </div>
                </div>
              </button>
            </div>
          </aside>
          
          <!-- Column 2: Assistant Body (Focus Area) -->
          <main class="flex-1 bg-white p-8 lg:p-12 overflow-y-auto">
            <div class="max-w-4xl mx-auto space-y-8">
              <div class="flex items-end justify-between">
                <div>
                  <h3 class="text-2xl font-bold text-gray-900">{{ currentItem?.expense.merchant }}</h3>
                  <p class="text-sm text-gray-500">{{ new Date(currentItem?.expense.date || '').toLocaleDateString('en-AU', { dateStyle: 'full' }) }}</p>
                </div>
                <div class="text-right">
                  <div class="text-3xl font-black text-gray-900">{{ formatCurrency(currentItem?.expense.total) }}</div>
                  <div class="text-xs font-bold text-success-600 uppercase tracking-widest mt-1">Ready to copy</div>
                </div>
              </div>

              <!-- Grid of Copy Cards -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CopyCard 
                  ref="cardDate"
                  label="1. Invoice Date" 
                  :value="currentItem?.expense.date ? new Date(currentItem.expense.date).toLocaleDateString('en-AU') : ''" 
                  shortcut-key="1"
                />
                <CopyCard 
                  ref="cardProvider"
                  label="2. Provider" 
                  :value="currentItem?.expense.merchant || ''" 
                  shortcut-key="2"
                />
                <CopyCard 
                  ref="cardAmount"
                  label="3. Amount" 
                  :value="currentItem?.expense.total?.toFixed(2) || ''" 
                  shortcut-key="3"
                />
                <CopyCard 
                  ref="cardMfb"
                  label="4. MFB %" 
                  :value="(currentItem?.mfbPercent ?? 100) + '%'" 
                  shortcut-key="4"
                />
                <CopyCard 
                  ref="cardGst"
                  label="5. GST Amount" 
                  :value="currentItem?.gstAmount?.toFixed(2) || '0.00'" 
                  shortcut-key="5"
                />
                <CopyCard 
                  label="Category (Reference)" 
                  :value="currentItem?.ptcCategory || ''" 
                  is-reference
                  :warning="!currentItem?.ptcCategory"
                />
              </div>

              <!-- Navigation Footer -->
              <div class="flex items-center justify-between pt-8 border-t border-gray-50">
                <UButton 
                  color="neutral" 
                  variant="ghost" 
                  icon="i-heroicons-arrow-left" 
                  label="Previous" 
                  :disabled="currentIndex === 0"
                  @click="currentIndex--"
                />
                
                <div class="flex items-center gap-1">
                  <div 
                    v-for="(_, idx) in selectedForClaim" 
                    :key="idx"
                    class="w-1.5 h-1.5 rounded-full transition-all"
                    :class="currentIndex === idx ? 'bg-primary-500 w-4' : 'bg-gray-200'"
                  />
                </div>

                <UButton 
                  color="neutral" 
                  variant="ghost" 
                  icon="i-heroicons-arrow-right" 
                  trailing
                  label="Next" 
                  :disabled="currentIndex === selectedForClaim.length - 1"
                  @click="currentIndex++"
                />
              </div>
            </div>
          </main>

          <!-- Column 3: Receipt Preview (360px) -->
          <aside class="w-96 border-l border-gray-100 bg-gray-50 flex flex-col overflow-hidden relative group">
            <div class="absolute inset-0 flex items-center justify-center p-6">
              <SecureImage 
                v-if="currentItem"
                :src="getImageUrl(currentItem.expense.id)" 
                className="w-full h-full rounded-2xl shadow-xl bg-white transition-transform duration-200" 
                :class="[
                  'cursor-crosshair',
                  isZoomLocked ? 'ring-4 ring-primary-500/30' : ''
                ]"
                :style="{ 
                  transform: isHovering || isZoomLocked ? 'scale(2.5)' : 'scale(1)',
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`
                }"
                @mousemove="handleImageMove"
                @mouseenter="isHovering = true"
                @mouseleave="isHovering = false"
                @click="toggleZoomLock"
                alt="Receipt"
              />
              
              <!-- Zoom Indicator -->
              <div 
                class="absolute top-10 right-10 bg-black/50 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                {{ isZoomLocked ? 'Zoom Locked' : 'Hover to Zoom' }}
              </div>

              <a 
                v-if="currentItem"
                :href="getImageUrl(currentItem.expense.id)" 
                target="_blank"
                class="absolute bottom-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur text-xs px-4 py-2 rounded-full shadow-lg hover:bg-white flex items-center gap-2 font-bold text-gray-900 z-10 border border-gray-100"
              >
                <UIcon name="i-heroicons-arrow-top-right-on-square" />
                View Original
              </a>
            </div>
          </aside>
        </div>
      </template>
    </UModal>
  </div>
</template>

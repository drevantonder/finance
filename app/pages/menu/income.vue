<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '~/composables/useSessionStore'
import { useProjectionResults } from '~/composables/useProjectionResults'
import { formatCurrency } from '~/composables/useFormatter'

const store = useSessionStore()
const { borrowingResult, targetDateLabel, smartResult } = useProjectionResults()

// Simulation logic
const tmnBoost = ref(0)

const currentMonthlySurplus = computed(() => {
  return smartResult.value?.series[0]?.surplus || 0
})

const borrowingCapacity = computed(() => {
  return borrowingResult.value?.borrowingCapacity || 0
})

const totalMonthlyIncome = computed(() => {
  return smartResult.value?.series[0]?.netIncome || 0
})

const impactMonths = computed(() => {
  if (!borrowingResult.value || !smartResult.value) return 0
  
  const targetCosts = borrowingResult.value.costs.totalCosts
  const currentDeposit = store.projectedDeposit
  const remaining = Math.max(0, targetCosts - currentDeposit)
  
  const currentSurplus = Math.max(1, currentMonthlySurplus.value)
  const boostedSurplus = currentSurplus + tmnBoost.value
  
  const monthsCurrent = remaining / currentSurplus
  const monthsBoosted = remaining / boostedSurplus
  
  return Math.round(monthsCurrent - monthsBoosted)
})

const impactLabel = computed(() => {
  if (impactMonths.value <= 0) return 'No timeline impact'
  if (impactMonths.value === 1) return '1 month earlier'
  return `${impactMonths.value} months earlier`
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Income Strategy</h1>
    </div>

    <!-- Impact Widget (Sticky) -->
    <div class="sticky top-0 lg:top-4 z-20">
      <UCard 
        class="bg-gradient-to-br from-primary-50 to-white dark:from-primary-950 dark:to-gray-900 border-primary-200 dark:border-primary-800 shadow-xl"
      >
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div class="space-y-1">
            <div class="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">Projected Timeline</div>
            <div class="text-3xl font-black text-gray-900 dark:text-white leading-tight">
              Ready by {{ targetDateLabel }}
            </div>
            <div class="flex items-center gap-4 text-sm text-gray-500">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-banknotes" class="w-4 h-4" />
                Capacity: {{ formatCurrency(borrowingCapacity) }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-arrow-trending-up" class="w-4 h-4" />
                Surplus: {{ formatCurrency(currentMonthlySurplus) }}/mo
              </span>
            </div>
          </div>

          <div class="lg:w-72 space-y-3 bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-gray-500">SURPLUS POWER-UP</span>
              <span v-if="tmnBoost > 0" class="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                +{{ formatCurrency(tmnBoost) }}
              </span>
            </div>
            
            <USlider v-model="tmnBoost" :min="0" :max="2000" :step="100" color="primary" />
            
            <div class="flex items-center gap-2">
              <UIcon 
                :name="tmnBoost > 0 ? 'i-heroicons-bolt' : 'i-heroicons-light-bulb'" 
                :class="tmnBoost > 0 ? 'text-primary-500' : 'text-gray-400'"
                class="w-5 h-5 flex-shrink-0" 
              />
              <span class="text-sm font-semibold" :class="tmnBoost > 0 ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500'">
                {{ tmnBoost > 0 ? impactLabel : 'Adjust slider to see impact' }}
              </span>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <!-- Household -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-users" class="w-5 h-5 text-gray-400" />
              <h2 class="font-bold">Household Members</h2>
            </div>
          </template>
          <Household />
        </UCard>

        <!-- Income Sources -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-briefcase" class="w-5 h-5 text-gray-400" />
                <h2 class="font-bold">Income Sources</h2>
              </div>
              <div class="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {{ formatCurrency(totalMonthlyIncome) }} / MO NET
              </div>
            </div>
          </template>
          <div class="divide-y divide-gray-100 dark:divide-gray-800">
            <div v-for="source in store.config.incomeSources" :key="source.id" 
                 class="group flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <div class="flex items-center gap-2">
                  <div class="font-bold text-gray-900 dark:text-white">{{ source.name }}</div>
                  <UBadge size="xs" color="neutral" variant="subtle" class="capitalize">{{ source.type }}</UBadge>
                </div>
                <div class="text-sm text-gray-500">
                  {{ store.config.people.find(p => p.id === source.personId)?.name || 'Unknown' }}
                </div>
              </div>
              <UButton 
                :to="`/income/${source.id}`" 
                variant="ghost" 
                color="neutral" 
                icon="i-heroicons-pencil-square" 
                trailing
              />
            </div>
            <div v-if="store.config.incomeSources.length === 0" class="py-10 text-center text-gray-500">
              <UIcon name="i-heroicons-plus-circle" class="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No income sources added yet</p>
            </div>
          </div>
        </UCard>
      </div>

      <div class="space-y-6">
        <!-- Guidance/Info -->
        <UCard class="bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900">
          <div class="space-y-4">
            <div class="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
              <UIcon name="i-heroicons-information-circle" class="w-5 h-5" />
              <span>TMN Strategy</span>
            </div>
            <p class="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed">
              Your <strong>TMN (Total Monthly Needs)</strong> is the core driver of your surplus. 
              Higher TMN increases your serviceability and DTI (Debt-to-Income) assessment at the bank, 
              but more importantly, it accelerates your deposit savings.
            </p>
            <p class="text-sm text-indigo-900/70 dark:text-indigo-100/70 leading-relaxed">
              Use the simulator above to see how small increases in your monthly ministry support can dramatically 
              shorten your timeline to house purchase.
            </p>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

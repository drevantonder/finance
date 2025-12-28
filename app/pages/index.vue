<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '~/composables/useSessionStore'
import { useExpensesQuery } from '~/composables/queries'
import { useProjectionResults } from '~/composables/useProjectionResults'
import { useLogger } from '~/composables/useLogger'
import { formatCurrency } from '~/composables/useFormatter'

const store = useSessionStore()
const { data: expenses } = useExpensesQuery()
const { borrowingResult, targetDateLabel, smartResult } = useProjectionResults()
const { logs } = useLogger()

// 1. Budget Pulse (Fortnightly)
const budgetFortnight = computed(() => {
  if (!store.config.budget.budgetItems) return 0
  return store.config.budget.budgetItems
    .filter(i => i.category !== 'goal')
    .reduce((acc, i) => {
      let amount = i.amount
      if (i.frequency === 'weekly') amount *= 2
      else if (i.frequency === 'monthly') amount *= 12 / 26
      else if (i.frequency === 'yearly') amount /= 26
      return acc + amount
    }, 0)
})

const actualFortnight = computed(() => {
  if (!expenses.value) return 0
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  return expenses.value
    .filter(e => e.date && new Date(e.date) > twoWeeksAgo)
    .reduce((acc, e) => acc + (e.total || 0), 0)
})

const budgetUsage = computed(() => {
  if (budgetFortnight.value === 0) return 0
  return (actualFortnight.value / budgetFortnight.value) * 100
})

const budgetColor = computed(() => {
  if (budgetUsage.value > 100) return 'error'
  if (budgetUsage.value > 80) return 'warning'
  return 'success'
})

// 2. Goal Progress (North Star)
const goalProgress = computed(() => {
  const current = store.projectedDeposit
  const target = borrowingResult.value?.costs.totalCosts || 1
  return Math.min(100, Math.round((current / target) * 100))
})

// 3. Attention Items
const attentionItems = computed(() => {
  const items = []
  
  const unprocessed = expenses.value?.filter(e => e.status === 'pending').length || 0
  if (unprocessed > 0) {
    items.push({
      label: `${unprocessed} unprocessed expenses`,
      icon: 'i-heroicons-receipt-percent',
      color: 'warning'
    })
  }

  const surplus = smartResult.value?.series[0]?.surplus || 0
  if (surplus > 1000) {
    items.push({
      label: `Surplus of ${formatCurrency(surplus)} to invest`,
      icon: 'i-heroicons-arrow-trending-up',
      color: 'info'
    })
  }

  return items
})

const recentLogs = computed(() => logs.value.slice(0, 5))
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Dash</h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Budget Pulse -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Budget Pulse</h3>
            <span class="text-sm text-gray-500">Last 14 days</span>
          </div>
        </template>
        <div class="space-y-4">
          <div class="flex justify-between items-end">
            <div>
              <div class="text-2xl font-bold" :class="`text-${budgetColor}-500`">
                {{ formatCurrency(actualFortnight) }}
              </div>
              <div class="text-xs text-gray-500">of {{ formatCurrency(budgetFortnight) }}</div>
            </div>
            <div class="text-right">
              <div class="text-lg font-semibold">{{ Math.round(budgetUsage) }}%</div>
            </div>
          </div>
          <UProgress :value="budgetUsage" :color="budgetColor" size="sm" />
        </div>
      </UCard>

      <!-- Goal Progress -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Goal Progress</h3>
            <NuxtLink to="/goal" class="text-xs text-primary-500 hover:underline">View Strategy</NuxtLink>
          </div>
        </template>
        <div class="space-y-4">
          <div class="flex justify-between items-end">
            <div>
              <div class="text-2xl font-bold text-primary-500">{{ goalProgress }}%</div>
              <div class="text-xs text-gray-500">Target: {{ targetDateLabel }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500">Deposit: {{ formatCurrency(store.projectedDeposit) }}</div>
            </div>
          </div>
          <UProgress :value="goalProgress" color="primary" size="sm" />
        </div>
      </UCard>

      <!-- Attention -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">Attention</h3>
        </template>
        <div class="space-y-3">
          <div v-if="attentionItems.length === 0" class="text-sm text-gray-500 italic py-2">
            Everything looks good!
          </div>
          <div v-for="item in attentionItems" :key="item.label" class="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
            <UIcon :name="item.icon" :class="`text-${item.color}-500`" class="w-5 h-5" />
            <span class="text-sm">{{ item.label }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Recent Activity -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">Recent Activity</h3>
          <NuxtLink to="/menu/system" class="text-xs text-gray-500 hover:underline">View All</NuxtLink>
        </div>
      </template>
      <div class="space-y-2">
        <div v-if="recentLogs.length === 0" class="text-sm text-gray-500 italic py-4 text-center">
          No recent activity logs.
        </div>
        <ActivityLogEntry v-for="log in recentLogs" :key="log.id" :entry="log" />
      </div>
    </UCard>
  </div>
</template>

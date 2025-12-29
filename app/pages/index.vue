<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '~/composables/useSessionStore'
import { useExpensesQuery } from '~/composables/queries'
import { useProjectionResults } from '~/composables/useProjectionResults'
import { useLogger } from '~/composables/useLogger'
import { formatCurrency } from '~/composables/useFormatter'
import AssetsChart from '~/components/AssetsChart.vue'
import BudgetProjectionChart from '~/components/BudgetProjectionChart.vue'
import FinancialCompositionChart from '~/components/FinancialCompositionChart.vue'

const store = useSessionStore()
const { data: expenses } = useExpensesQuery()
const { targetDateLabel, smartResult, chartSeries } = useProjectionResults()
const { logs } = useLogger()

// Attention Items
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
      <h1 class="text-2xl font-bold">Dashboard</h1>
    </div>

    <div class="flex flex-wrap gap-3">
      <UButton
        to="/menu/assets"
        icon="i-heroicons-circle-stack"
        color="neutral"
        variant="soft"
        label="Update Assets"
      />
      <UButton
        to="/goal"
        icon="i-heroicons-home-modern"
        color="neutral"
        variant="soft"
        label="View Goal"
      />
    </div>

    <!-- Attention Items -->
    <div v-if="attentionItems.length > 0">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2 text-warning-500">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
            <h3 class="font-semibold text-gray-900 dark:text-white">Attention Needed</h3>
          </div>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="item in attentionItems" :key="item.label" class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <UIcon :name="item.icon" :class="`text-${item.color}-500`" class="w-5 h-5" />
            <span class="text-sm font-medium">{{ item.label }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Main Insights Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Allocation (Pie/Doughnut) -->
      <UCard class="lg:col-span-1">
        <template #header>
          <h3 class="font-semibold">Allocation</h3>
        </template>
        <FinancialCompositionChart />
      </UCard>

      <!-- Net Worth Projection -->
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Net Worth Projection</h3>
            <span class="text-xs text-gray-500">Target: {{ targetDateLabel }}</span>
          </div>
        </template>
        <div class="h-64">
          <AssetsChart :series="chartSeries" />
        </div>
      </UCard>

      <!-- Cash Flow Projection -->
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Cash Flow Projection</h3>
            <span class="text-xs text-gray-500">Monthly Surplus vs Expenses</span>
          </div>
        </template>
        <div class="h-64">
          <BudgetProjectionChart :series="chartSeries" />
        </div>
      </UCard>

      <!-- Recent Activity -->
      <UCard class="lg:col-span-1">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Recent Activity</h3>
            <NuxtLink to="/menu/system" class="text-xs text-gray-500 hover:underline">View All</NuxtLink>
          </div>
        </template>
        <div class="space-y-4">
          <div v-if="recentLogs.length === 0" class="text-sm text-gray-500 italic py-4 text-center">
            No recent activity logs.
          </div>
          <ActivityLogEntry v-for="log in recentLogs" :key="log.id" :entry="log" />
        </div>
      </UCard>
    </div>
  </div>
</template>

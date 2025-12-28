<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between px-1">
      <h4 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {{ view === 'budget' ? 'Monthly Budget' : 'Deposit Composition' }}
      </h4>
      <div class="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
        <button 
          @click="view = 'budget'"
          class="px-2 py-0.5 text-[10px] font-medium rounded-md transition-all"
          :class="view === 'budget' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        >
          Budget
        </button>
        <button 
          @click="view = 'deposit'"
          class="px-2 py-0.5 text-[10px] font-medium rounded-md transition-all"
          :class="view === 'deposit' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        >
          Deposit
        </button>
      </div>
    </div>

    <div class="relative h-64 w-full flex items-center justify-center">
      <Doughnut :data="chartData" :options="chartOptions" />
      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
        <span class="text-xs text-gray-500 font-medium uppercase tracking-tighter">Total</span>
        <span class="text-xl font-bold text-gray-900 dark:text-white">{{ formatCurrency(totalValue) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { useSessionStore } from '~/composables/useSessionStore'
import { formatCurrency } from '~/composables/useFormatter'

const store = useSessionStore()
const view = ref<'budget' | 'deposit'>('budget')

const budgetData = computed(() => {
  const items = store.config.budget.budgetItems || []
  const totals: Record<string, number> = {
    essential: 0,
    recurring: 0,
    goal: 0,
    hecs: 0
  }

  items.forEach(i => {
    let amount = i.amount
    if (i.frequency === 'weekly') amount *= 52 / 12
    else if (i.frequency === 'fortnightly') amount *= 26 / 12
    else if (i.frequency === 'yearly') amount /= 12
    else if (i.frequency === 'quarterly') amount /= 3
    
    if (totals[i.category] !== undefined) {
      totals[i.category] += amount
    }
  })

  // HECS from smart result or projection if available
  const firstPoint = store.smartResult?.series[0]
  if (firstPoint) {
    totals.hecs = firstPoint.totalHecsRepayment || 0
  }

  return [
    { label: 'Essential', value: totals.essential, color: '#f43f5e' }, // rose-500
    { label: 'Recurring', value: totals.recurring, color: '#f59e0b' }, // amber-500
    { label: 'Goal Savings', value: totals.goal, color: '#a855f7' },  // purple-500
    { label: 'HECS', value: totals.hecs, color: '#f97316' }           // orange-500
  ].filter(d => d.value > 0)
})

const depositData = computed(() => {
  const deposit = store.config.deposit
  const cash = deposit.cashSavings || 0
  const stocks = deposit.holdings?.reduce((acc, h) => acc + (h.shares * (store.stockPrices[h.symbol] || 0)), 0) || 0
  const fhss = deposit.fhssContributions?.reduce((acc, c) => acc + c.amount, 0) || 0

  return [
    { label: 'Cash Savings', value: cash, color: '#10b981' }, // emerald-500
    { label: 'Stocks', value: stocks, color: '#3b82f6' },      // blue-500
    { label: 'FHSS', value: fhss, color: '#14b8a6' }         // teal-500
  ].filter(d => d.value > 0)
})

const currentDataPoints = computed(() => view.value === 'budget' ? budgetData.value : depositData.value)

const totalValue = computed(() => currentDataPoints.value.reduce((acc, d) => acc + d.value, 0))

const chartData = computed(() => ({
  labels: currentDataPoints.value.map(d => d.label),
  datasets: [{
    data: currentDataPoints.value.map(d => d.value),
    backgroundColor: currentDataPoints.value.map(d => d.color),
    borderWidth: 0,
    hoverOffset: 4,
    cutout: '75%'
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        boxWidth: 10,
        padding: 15,
        font: { size: 11, weight: '500' },
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: '#1f2937',
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (context: any) => {
          const val = context.raw
          const pct = Math.round((val / totalValue.value) * 100)
          return ` ${formatCurrency(val)} (${pct}%)`
        }
      }
    }
  }
}
</script>

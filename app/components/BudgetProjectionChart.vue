<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between px-1">
      <h4 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Projected Expenses</h4>
      <div class="flex bg-gray-100 p-0.5 rounded-lg">
        <button 
          @click="displayMode = 'month'"
          class="px-2 py-0.5 text-[10px] font-medium rounded-md transition-all"
          :class="displayMode === 'month' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'"
        >
          Month
        </button>
        <button 
          @click="displayMode = 'fortnight'"
          class="px-2 py-0.5 text-[10px] font-medium rounded-md transition-all"
          :class="displayMode === 'fortnight' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'"
        >
          Fortnight
        </button>
      </div>
    </div>
    
    <div class="h-48 w-full">
      <Bar :key="displayMode" :data="(chartData as any)" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ProjectionSeriesPoint, BudgetCategory } from '~/types'
import { formatCurrency } from '~/composables/useFormatter'
import { useSessionStore } from '~/composables/useSessionStore'

const store = useSessionStore()
const props = defineProps<{
  series: ProjectionSeriesPoint[]
}>()

const displayMode = ref<'month' | 'fortnight'>('month')

const categoriesMap: Record<string, { label: string; color: string }> = {
  essential: { label: 'Essential', color: '#f43f5e' }, // rose-500
  recurring: { label: 'Recurring', color: '#f59e0b' }, // amber-500
  goal: { label: 'Goal Savings', color: '#a855f7' }, // purple-500
  hecs: { label: 'HECS Repayment', color: '#f97316' }, // orange-500
}

// Generate fortnightly data points from monthly data with realistic distribution
const fortnightlyData = computed(() => {
  if (props.series.length === 0) return []
  
  const result: { date: Date; label: string; expenseBreakdown: Record<string, number>; oneOff: number; hecs: number }[] = []
  
  for (const pt of props.series) {
    const monthStr = pt.date.substring(0, 7) // "2025-12"
    const monthDate = new Date(pt.date)
    
    // 1. Calculate real One-off distribution for this month
    const monthOneOffs = store.config.budget.oneOffExpenses.filter(e => e.date.startsWith(monthStr))
    
    let f1OneOff = 0
    let f2OneOff = 0
    
    monthOneOffs.forEach(e => {
      const day = parseInt(e.date.substring(8, 10))
      if (day <= 14) f1OneOff += e.amount
      else f2OneOff += e.amount
    })
    
    // Also include goals hitting deadline this month
    const monthGoalsHittingDeadline = store.config.budget.budgetItems.filter(i => 
      i.category === 'goal' && 
      i.deadline?.startsWith(monthStr) &&
      !i.completedAt
    )
    
    monthGoalsHittingDeadline.forEach(g => {
      const day = parseInt(g.deadline!.substring(8, 10))
      if (day <= 14) f1OneOff += g.amount
      else f2OneOff += g.amount
    })

    // 2. Distribute Recurring Items
    const distribute = (total: number) => ({
      f1: Math.round(total * 0.6),
      f2: Math.round(total * 0.4)
    })

    const essentialDist = distribute(pt.expenseBreakdown?.essential || 0)
    const recurringDist = distribute(pt.expenseBreakdown?.recurring || 0)
    const goalDist = { f1: Math.round((pt.expenseBreakdown?.goal || 0) / 2), f2: Math.round((pt.expenseBreakdown?.goal || 0) / 2) }
    
    // HECS split
    const hecsDist = { f1: Math.round(pt.totalHecsRepayment / 2), f2: Math.round(pt.totalHecsRepayment / 2) }

    // First half of the month
    const d1 = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    result.push({
      date: d1,
      label: d1.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }),
      expenseBreakdown: {
        essential: essentialDist.f1,
        recurring: recurringDist.f1,
        goal: goalDist.f1,
      },
      oneOff: f1OneOff,
      hecs: hecsDist.f1
    })
    
    // Second half of the month
    const d2 = new Date(monthDate.getFullYear(), monthDate.getMonth(), 15)
    result.push({
      date: d2,
      label: d2.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }),
      expenseBreakdown: {
        essential: essentialDist.f2,
        recurring: recurringDist.f2,
        goal: goalDist.f2,
      },
      oneOff: f2OneOff,
      hecs: hecsDist.f2
    })
  }
  
  return result
})

const chartData = computed(() => {
  const isFortnightly = displayMode.value === 'fortnight'
  
  if (isFortnightly) {
    const data = fortnightlyData.value
    const labels = data.map(pt => pt.label)
    
    const datasets = [
      {
        label: categoriesMap.essential!.label,
        data: data.map(pt => pt.expenseBreakdown.essential),
        backgroundColor: categoriesMap.essential!.color,
        stack: 'expenses',
        borderRadius: 2,
      },
      {
        label: categoriesMap.recurring!.label,
        data: data.map(pt => pt.expenseBreakdown.recurring),
        backgroundColor: categoriesMap.recurring!.color,
        stack: 'expenses',
        borderRadius: 2,
      },
      {
        label: categoriesMap.goal!.label,
        data: data.map(pt => pt.expenseBreakdown.goal),
        backgroundColor: categoriesMap.goal!.color,
        stack: 'expenses',
        borderRadius: 2,
      },
      {
        label: categoriesMap.hecs!.label,
        data: data.map(pt => pt.hecs),
        backgroundColor: categoriesMap.hecs!.color,
        stack: 'expenses',
        borderRadius: 2,
      },
      {
        label: 'One-off Expenses',
        data: data.map(pt => pt.oneOff),
        backgroundColor: '#94a3b8',
        stack: 'expenses',
        borderRadius: 2,
      }
    ]

    return { labels, datasets }
  }
  
  // Monthly view
  const labels = props.series.map(pt => {
    const date = new Date(pt.date)
    return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
  })
  
  const datasets = [
    {
      label: categoriesMap.essential!.label,
      data: props.series.map(pt => Math.round(pt.expenseBreakdown.essential || 0)),
      backgroundColor: categoriesMap.essential!.color,
      stack: 'expenses',
      borderRadius: 2,
    },
    {
      label: categoriesMap.recurring!.label,
      data: props.series.map(pt => Math.round(pt.expenseBreakdown.recurring || 0)),
      backgroundColor: categoriesMap.recurring!.color,
      stack: 'expenses',
      borderRadius: 2,
    },
    {
      label: categoriesMap.goal!.label,
      data: props.series.map(pt => Math.round(pt.expenseBreakdown.goal || 0)),
      backgroundColor: categoriesMap.goal!.color,
      stack: 'expenses',
      borderRadius: 2,
    },
    {
      label: categoriesMap.hecs!.label,
      data: props.series.map(pt => Math.round(pt.totalHecsRepayment || 0)),
      backgroundColor: categoriesMap.hecs!.color,
      stack: 'expenses',
      borderRadius: 2,
    },
    {
      label: 'One-off Expenses',
      data: props.series.map(pt => Math.round(pt.oneOffExpensesPaid)),
      backgroundColor: '#94a3b8',
      stack: 'expenses',
      borderRadius: 2,
    }
  ]

  return { labels, datasets }
})

const chartOptions = computed(() => {
  const todayIndex = props.series.findIndex(pt => !pt.isHistorical)

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { 
          font: { size: 9 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: displayMode.value === 'month' ? 'Monthly' : 'Fortnightly',
          font: { size: 10, weight: 'bold' as const },
        },
        ticks: {
          font: { size: 9 },
          callback: (value: any) => formatCurrency(value, { abbrev: true }),
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 8,
          font: { size: 9 },
          padding: 10
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
        },
      },
      annotation: {
        annotations: {
          todayLine: {
            type: 'line' as const,
            xMin: todayIndex >= 0 ? todayIndex : undefined,
            xMax: todayIndex >= 0 ? todayIndex : undefined,
            borderColor: 'rgba(0, 0, 0, 0.3)',
            borderWidth: 1,
          }
        },
      },
    },
  }
})
</script>

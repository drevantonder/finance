<template>
  <div class="h-48 w-full">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ProjectionSeriesPoint } from '~/types'
import { formatCurrency } from '~/composables/useFormatter'

const props = defineProps<{
  series: ProjectionSeriesPoint[]
}>()

const chartData = computed(() => {
  const labels = props.series.map(pt => {
    const date = new Date(pt.date)
    return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
  })

  return {
    labels,
    datasets: [
      {
        label: 'Surplus',
        data: props.series.map(pt => pt.surplus),
        backgroundColor: '#10b981', // emerald-500
        borderRadius: 4,
        stack: 'flow',
      },
      {
        label: 'Expenses',
        data: props.series.map(pt => -pt.expenses),
        backgroundColor: '#f43f5e', // rose-500
        borderRadius: 4,
        stack: 'flow',
      },
    ],
  }
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
    plugins: {
      legend: { 
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          font: { size: 9 },
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(Math.abs(context.parsed.y))}`,
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
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          font: { size: 9 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Net Flow (Surplus / Expenses)',
          font: { size: 10, weight: 'bold' as const },
        },
        ticks: {
          font: { size: 9 },
          callback: (value: any) => formatCurrency(Math.abs(value), { abbrev: true }),
        },
      },
    },
  }
})
</script>

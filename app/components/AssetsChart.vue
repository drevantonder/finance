<template>
  <div class="h-64 w-full">
    <Line :data="(chartData as any)" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import type { ProjectionSeriesPoint } from '~/types'
import { formatCurrency } from '~/composables/useFormatter'

const props = defineProps<{
  series: ProjectionSeriesPoint[]
  emergencyTarget?: number
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
        label: 'Emergency Fund',
        data: props.series.map(pt => pt.emergencyFund),
        backgroundColor: 'rgba(156, 163, 175, 0.3)', // gray-400
        borderColor: '#9ca3af',
        fill: true,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'Stocks',
        data: props.series.map(pt => pt.stocksValue),
        backgroundColor: 'rgba(168, 85, 247, 0.5)', // purple-500
        borderColor: '#a855f7',
        fill: true,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'FHSS',
        data: props.series.map(pt => pt.fhssValue),
        backgroundColor: 'rgba(20, 184, 166, 0.5)', // teal-500
        borderColor: '#14b8a6',
        fill: true,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'HECS Debt',
        data: props.series.map(pt => -pt.totalHecsBalance),
        backgroundColor: 'rgba(249, 115, 22, 0.3)', // orange-500
        borderColor: '#f97316',
        fill: true,
        pointRadius: 0,
        tension: 0.3,
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
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          font: { size: 10 },
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Assets Value',
          font: { size: 10, weight: 'bold' as const },
        },
        ticks: {
          font: { size: 10 },
          callback: (value: any) => {
            const fmt = formatCurrency(Math.abs(value), { abbrev: true })
            return value < 0 ? `-${fmt}` : fmt
          },
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: { size: 10 },
          // Filter out HECS Debt if it's zero throughout? No, keep it.
        },
      },
      tooltip: {
        padding: 10,
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || ''
            if (label) label += ': '
            if (context.parsed.y !== null) {
              const val = context.parsed.y
              const fmt = formatCurrency(Math.abs(val))
              label += val < 0 ? `-${fmt}` : fmt
            }
            return label
          },
        },
      },
      annotation: {
        annotations: {
          todayLine: {
            type: 'line' as const,
            xMin: todayIndex >= 0 ? todayIndex : undefined,
            xMax: todayIndex >= 0 ? todayIndex : undefined,
            borderColor: 'rgba(0, 0, 0, 0.5)',
            borderWidth: 1,
            label: {
              display: true,
              content: 'Today',
              position: 'start' as const,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              font: { size: 10 },
            },
          }
        },
      },
    },
  }
})
</script>

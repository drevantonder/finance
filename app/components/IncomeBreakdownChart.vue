<template>
  <div class="h-48 w-full">
    <Chart :type="'bar'" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Chart } from 'vue-chartjs'
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

  // Group by source name to create datasets
  const sources = new Set<string>()
  props.series.forEach(pt => pt.incomeBreakdown.forEach(item => sources.add(item.sourceName)))

  const sourceList = Array.from(sources)
  const colors = [
    '#3b82f6', // blue
    '#a855f7', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f59e0b', // amber
  ]

  const datasets: any[] = sourceList.map((sourceName, index) => {
    return {
      type: 'bar' as const,
      label: sourceName,
      data: props.series.map(pt => {
        const item = pt.incomeBreakdown.find(i => i.sourceName === sourceName)
        return item ? item.netIncome : 0
      }),
      backgroundColor: colors[index % colors.length] + '90', // Higher opacity for bars
      borderColor: colors[index % colors.length],
      borderWidth: 1,
      stack: 'income',
      order: 2,
    }
  })

  // Add TMN lines
  datasets.push({
    type: 'line' as const,
    label: 'TMN Target',
    data: props.series.map(pt => pt.tmnTarget),
    borderColor: '#10b981', // emerald-500
    borderWidth: 2,
    borderDash: [5, 5],
    fill: false,
    stepped: 'after' as const,
    pointRadius: 0,
    yAxisID: 'y1',
    order: 1,
  })

  datasets.push({
    type: 'line' as const,
    label: 'Partner Commitments',
    data: props.series.map(pt => pt.partnerCommitments),
    borderColor: '#f59e0b', // amber-500
    borderWidth: 2,
    fill: false,
    stepped: 'after' as const,
    pointRadius: 0,
    yAxisID: 'y1',
    order: 1,
  })

  return {
    labels,
    datasets,
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
        stacked: true,
        grid: { display: false },
        ticks: {
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
          text: 'Net Income',
          font: { size: 10, weight: 'bold' as const },
        },
        ticks: {
          font: { size: 10 },
          callback: (value: any) => formatCurrency(value, { abbrev: true }),
        },
      },
      y1: {
        position: 'right' as const,
        beginAtZero: true,
        display: true,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Monthly TMN',
          font: { size: 10, weight: 'bold' as const },
        },
        ticks: {
          font: { size: 10 },
          callback: (value: any) => formatCurrency(value, { abbrev: true }),
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          font: { size: 9 },
        },
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
            xMin: todayIndex >= 0 ? todayIndex - 0.5 : undefined,
            xMax: todayIndex >= 0 ? todayIndex - 0.5 : undefined,
            borderColor: 'rgba(0, 0, 0, 0.3)',
            borderWidth: 1,
          }
        },
      },
    },
  }
})
</script>

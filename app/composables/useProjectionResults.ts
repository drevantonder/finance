import { computed } from 'vue'
import { useSessionStore } from '~/composables/useSessionStore'
import { calculateCapacity } from '~/composables/useLoanCalculator'
import { formatDateLabel } from '~/composables/useFormatter'

export function useProjectionResults() {
  const store = useSessionStore()
  
  const borrowingResult = computed(() => calculateCapacity(
    store.config.people,
    store.config.incomeSources,
    store.projectedDeposit,
    store.config.loan,
    store.config.costs,
    store.config.deposit.targetDate
  ))
  
  const targetDateLabel = computed(() => 
    formatDateLabel(store.config.deposit.targetDate, 'short'))
    
  const exactTargetDateLabel = computed(() => 
    formatDateLabel(store.config.deposit.targetDate, 'full'))
  
  const smartResult = computed(() => store.smartResult)
  
  const chartSeries = computed(() => store.displaySeries)
  
  const hasPartialMonthExcluded = computed(() => {
    if (!smartResult.value?.series.length) return false
    return smartResult.value.series.length !== store.displaySeries.length
  })
  
  return {
    borrowingResult,
    targetDateLabel,
    exactTargetDateLabel,
    smartResult,
    chartSeries,
    hasPartialMonthExcluded
  }
}

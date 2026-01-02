import type { IncomeSource } from '~/types'

/**
 * Check if an income is active on a given date
 */
export function isIncomeActiveOnDate(source: IncomeSource, date: Date): boolean {
  if (source.startDate && new Date(source.startDate) > date) return false
  if (source.endDate && new Date(source.endDate) < date) return false
  return true
}

/**
 * Get all incomes active on a specific date
 */
export function getActiveIncomeSources(
  sources: IncomeSource[], 
  date: Date
): IncomeSource[] {
  return sources.filter(s => isIncomeActiveOnDate(s, date))
}

/**
 * Counts how many fortnightly payments occur between two dates based on an anchor date.
 */
export function countFortnightsInRange(
  anchorDate: Date,
  startDate: Date,
  endDate: Date
): { count: number; partialFraction: number } {
  const msPerFortnight = 14 * 24 * 60 * 60 * 1000
  const anchorMs = anchorDate.getTime()
  const startMs = startDate.getTime()
  const endMs = endDate.getTime()
  
  // Find the first payment on or after startDate
  const fortnightsSinceAnchor = Math.floor((startMs - anchorMs) / msPerFortnight)
  let firstPaymentAfterStart = new Date(anchorMs + (fortnightsSinceAnchor + 1) * msPerFortnight)
  
  if (firstPaymentAfterStart.getTime() < startMs) {
    firstPaymentAfterStart = new Date(firstPaymentAfterStart.getTime() + msPerFortnight)
  }
  
  let count = 0
  let currentPayment = firstPaymentAfterStart
  while (currentPayment.getTime() <= endMs) {
    count++
    currentPayment = new Date(currentPayment.getTime() + msPerFortnight)
  }
  
  const lastPaymentBeforeEnd = new Date(currentPayment.getTime() - msPerFortnight)
  const rangeStartForPartial = count > 0 ? lastPaymentBeforeEnd.getTime() : startMs
  
  const remainingMs = endMs - rangeStartForPartial
  const partialFraction = Math.max(0, Math.min(1, remainingMs / msPerFortnight))
  
  return { count, partialFraction }
}

/**
 * Get the P2C Financial Year string (e.g. "2024-25") for a given date.
 * P2C Financial Year starts April 1st.
 */
export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() // 0-indexed
  const year = date.getFullYear()
  
  // If Jan-Mar, we are in the FY starting the previous year
  if (month < 3) {
    return `${year - 1}-${year.toString().slice(-2)}`
  }
  // If Apr-Dec, we are in the FY starting this year
  return `${year}-${(year + 1).toString().slice(-2)}`
}

export function useDateUtils() {
  return {
    isIncomeActiveOnDate,
    getActiveIncomeSources,
    countFortnightsInRange,
    getFinancialYear
  }
}

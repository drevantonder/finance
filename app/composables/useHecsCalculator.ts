import { getIncomeYear, calculateHecsRepayment } from '~/composables/useTaxCalculator'
import { isIncomeActiveOnDate } from '~/composables/useDateUtils'
import { calculateFPForValue, calculateIncomeBreakdown } from '~/composables/useTmnCalculator'
import type { IncomeSource, HecsDebt } from '~/types'

export interface HecsProjectionResult {
  projectedBalance: number
  totalRepayments: number
  totalIndexation: number
  totalAdditions: number
  yearlyBreakdown: {
    incomeYear: string
    startBalance: number
    repayments: number
    indexation: number
    additions: number
    endBalance: number
  }[]
}

/**
 * Returns the date indexation is applied (June 1st of the end of the financial year)
 * "2025-26" -> 2026-06-01
 */
export function getIndexationDate(incomeYear: string): Date {
  const parts = incomeYear.split('-')
  const endYear = 2000 + parseInt(parts[1] || '25')
  return new Date(`${endYear}-06-01`)
}

/**
 * Returns the end of the financial year (June 30)
 */
export function getIncomeYearEndDate(incomeYear: string): Date {
  const parts = incomeYear.split('-')
  const endYear = 2000 + parseInt(parts[1] || '25')
  return new Date(`${endYear}-06-30`)
}

/**
 * Calculate total HECS repayment income for a person across all their income sources
 */
export function calculatePersonRepaymentIncome(
  personId: string,
  incomeSources: IncomeSource[],
  incomeYear?: string, // Optional, but useful for accuracy if we ever have year-specific TMNs
  date?: Date         // NEW: Optional date to filter active incomes
): number {
  let personIncomes = incomeSources.filter(s => s.personId === personId)
  
  // Filter by date if provided
  if (date) {
    personIncomes = personIncomes.filter(s => isIncomeActiveOnDate(s, date))
  }
  
  let totalRepaymentIncome = 0
  
  for (const source of personIncomes) {
    if (source.type === 'tmn' && source.tmn) {
      // Repayment Income = Taxable + MFB
      const fp = calculateFPForValue(source.tmn.targetAmount, source.tmn.mmr, source.tmn.giving)
      const breakdown = calculateIncomeBreakdown(fp)
      totalRepaymentIncome += (breakdown.taxableIncome + breakdown.mfb) * 12
    } else if (source.type === 'salary' && source.salary) {
      totalRepaymentIncome += source.salary.grossAnnual
    } else if (source.type === 'centrelink' && source.centrelink && source.centrelink.taxable) {
      totalRepaymentIncome += (source.centrelink.fortnightlyAmount * 26)
    }
  }
  
  return totalRepaymentIncome
}

/**
 * Calculate person-level monthly HECS repayment
 */
export function calculatePersonMonthlyHecsRepayment(
  personId: string,
  incomeSources: IncomeSource[],
  date: Date,
  currentBalance: number
): { repayment: number; newBalance: number } {
  if (currentBalance <= 0) return { repayment: 0, newBalance: 0 }
  
  const incomeYear = getIncomeYear(date)
  const annualIncome = calculatePersonRepaymentIncome(personId, incomeSources, incomeYear, date)
  const annualRepayment = calculateHecsRepayment(annualIncome, incomeYear)
  const monthlyRepayment = Math.min(annualRepayment / 12, currentBalance)
  
  return { 
    repayment: monthlyRepayment, 
    newBalance: Math.max(0, currentBalance - monthlyRepayment) 
  }
}

/**
 * Advanced HECS Projection
 */
export function projectHecsBalance(
  hecs: HecsDebt,
  targetDateStr: string,
  incomeSources: IncomeSource[],
  personId: string
): HecsProjectionResult {
  const targetDate = new Date(targetDateStr)
  let currentBalance = hecs.balance
  let balanceDate = new Date(hecs.balanceAsOfDate)
  
  const yearlyBreakdown: HecsProjectionResult['yearlyBreakdown'] = []
  let totalRepayments = 0
  let totalIndexation = 0
  let totalAdditions = 0

  if (currentBalance <= 0 || balanceDate >= targetDate) {
    // Even if balance is 0, we might have future additions
    const futureAdditions = (hecs.scheduledAdditions || [])
      .filter(a => {
        const d = new Date(a.date)
        return d > balanceDate && d <= targetDate
      })
      .reduce((sum, a) => sum + Number(a.amount), 0)

    if (futureAdditions === 0 && currentBalance <= 0) {
      return {
        projectedBalance: Math.max(0, currentBalance),
        totalRepayments: 0,
        totalIndexation: 0,
        totalAdditions: 0,
        yearlyBreakdown: []
      }
    }
  }

  let loopDate = new Date(balanceDate)
  // Set to first of month for consistent step-wise calculation
  loopDate.setDate(1)

  while (loopDate < targetDate) {
    const incomeYear = getIncomeYear(loopDate)
    
    let yearRepayments = 0
    let yearIndexation = 0
    let yearAdditions = 0
    const startBalance = currentBalance

    // Step through months in this financial year (or until target)
    const yearEnd = getIncomeYearEndDate(incomeYear)
    
    while (loopDate <= yearEnd && loopDate < targetDate) {
      // 1. Check for Scheduled Additions in this month
      const monthStart = new Date(loopDate.getFullYear(), loopDate.getMonth(), 1)
      const monthEnd = new Date(loopDate.getFullYear(), loopDate.getMonth() + 1, 0, 23, 59, 59)
      
      const additionsThisMonth = (hecs.scheduledAdditions || [])
        .filter(a => {
          const d = new Date(a.date)
          return d >= monthStart && d <= monthEnd && d > balanceDate
        })
        .reduce((sum, a) => sum + Number(a.amount), 0)
      
      if (additionsThisMonth > 0) {
        currentBalance += additionsThisMonth
        yearAdditions += additionsThisMonth
        totalAdditions += additionsThisMonth
      }

      // 2. Monthly Repayment
      if (currentBalance > 0) {
        const annualIncome = calculatePersonRepaymentIncome(personId, incomeSources, incomeYear, loopDate)
        const annualRepayment = calculateHecsRepayment(annualIncome, incomeYear)
        const monthlyRepayment = annualRepayment / 12
        
        const actualRepayment = Math.min(monthlyRepayment, currentBalance)
        currentBalance -= actualRepayment
        yearRepayments += actualRepayment
        totalRepayments += actualRepayment
      }

      // 3. Annual Indexation (June 1st)
      // Check if we just passed June 1st in this loop
      if (loopDate.getMonth() === 5 && currentBalance > 0) { // June
         const indexation = currentBalance * hecs.indexationRate
         currentBalance += indexation
         yearIndexation += indexation
         totalIndexation += indexation
      }

      // Move to next month
      loopDate.setMonth(loopDate.getMonth() + 1)
    }

    yearlyBreakdown.push({
      incomeYear,
      startBalance: Math.round(startBalance),
      repayments: Math.round(yearRepayments),
      indexation: Math.round(yearIndexation),
      additions: Math.round(yearAdditions),
      endBalance: Math.round(currentBalance)
    })
  }

  return {
    projectedBalance: Math.round(currentBalance),
    totalRepayments: Math.round(totalRepayments),
    totalIndexation: Math.round(totalIndexation),
    totalAdditions: Math.round(totalAdditions),
    yearlyBreakdown
  }
}

export function useHecsCalculator() {
  return {
    projectHecsBalance,
    calculatePersonRepaymentIncome,
    calculatePersonMonthlyHecsRepayment,
    getIndexationDate,
    getIncomeYearEndDate
  }
}

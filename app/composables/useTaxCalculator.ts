import type { IncomeSource } from '~/types'

/**
 * HECS repayment thresholds for each income year.
 * From 2025-26 onwards, uses marginal rate system.
 * Source: https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds
 */
export interface HecsThresholds {
  minThreshold: number
  tier1Max: number
  tier2Max: number
  tier1Rate: number
  tier2Base: number
  tier2Rate: number
  tier3Rate: number
}

export const HECS_THRESHOLDS: Record<string, HecsThresholds> = {
  '2025-26': {
    minThreshold: 67000,
    tier1Max: 125000,
    tier2Max: 179285,
    tier1Rate: 0.15,
    tier2Base: 8700,
    tier2Rate: 0.17,
    tier3Rate: 0.10,
  }
}

const HECS_DEFAULT_YEAR = '2025-26'

/**
 * Returns income year string like "2025-26" for a given date.
 * Australian income year: July 1 - June 30.
 */
export function getIncomeYear(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-indexed
  if (month >= 6) { // July onwards
    return `${year}-${String(year + 1).slice(2)}`
  } else {
    return `${year - 1}-${String(year).slice(2)}`
  }
}

interface TaxBracket {
  threshold: number
  rate: number
  base: number
}

const TAX_BRACKETS_STAGE3: TaxBracket[] = [
  { threshold: 190000, rate: 0.45, base: 51638 },
  { threshold: 135000, rate: 0.37, base: 31288 },
  { threshold: 45000, rate: 0.30, base: 4288 },
  { threshold: 18200, rate: 0.16, base: 0 },
]

const MEDICARE_THRESHOLD = 26000
const MEDICARE_RATE = 0.02

/**
 * Calculate Australian Resident Tax (Stage 3 Cuts)
 * Brackets apply from 1 July 2024 onwards.
 * @param annualTaxableIncome - ANNUAL taxable income
 * @returns ANNUAL tax payable (including Medicare Levy)
 */
export function calculateIncomeTax(annualTaxableIncome: number): number {
  if (annualTaxableIncome <= 0) return 0
  
  let tax = 0
  for (const bracket of TAX_BRACKETS_STAGE3) {
    if (annualTaxableIncome > bracket.threshold) {
      tax = (annualTaxableIncome - bracket.threshold) * bracket.rate + bracket.base
      break
    }
  }

  // Medicare Levy (2%) - Simplified
  if (annualTaxableIncome > MEDICARE_THRESHOLD) {
    tax += annualTaxableIncome * MEDICARE_RATE
  }

  return tax
}

/**
 * Calculate annual HECS repayment based on gross salary.
 * Uses 2025-26 thresholds as fallback for unknown future years.
 */
export function calculateHecsRepayment(grossSalary: number, incomeYear?: string): number {
  const year = incomeYear || getIncomeYear(new Date())
  const thresholds = HECS_THRESHOLDS[year] || HECS_THRESHOLDS[HECS_DEFAULT_YEAR]

  if (!thresholds || grossSalary <= thresholds.minThreshold) return 0
  if (grossSalary >= thresholds.tier2Max) return grossSalary * thresholds.tier3Rate
  
  if (grossSalary > thresholds.tier1Max) {
    const overTier2 = grossSalary - thresholds.tier1Max
    return thresholds.tier2Base + (overTier2 * thresholds.tier2Rate)
  }
  
  const overThreshold = grossSalary - thresholds.minThreshold
  return overThreshold * thresholds.tier1Rate
}

export function useTaxCalculator() {
  return {
    calculateIncomeTax,
    calculateHecsRepayment,
    getIncomeYear,
    HECS_THRESHOLDS
  }
}

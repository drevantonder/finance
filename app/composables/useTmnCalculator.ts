import type { TmnIncomeConfig, IncomeSource } from '~/types'
import { calculateIncomeTax, calculateHecsRepayment } from '~/composables/useTaxCalculator'

// ===== CONSTANTS ===== //
export const STRATEGY_LEVY_PCT = 0.02    // 2% of (FP + MMR)
export const PTC_LEVY_PCT = 0.10         // 10% of TMN
export const REQUIRED_SUPER_PCT = 0.115  // 11.5% super requirement
export const TAXABLE_TO_SALARY = 0.5     // Always 50/50 split between Taxable and MFB
export const WORKERS_COMP_PCT = 0.017    // 1.7% of FP

/**
 * Calculate FP (Financial Package) from TMN using iterative solver
 */
export function calculateFP(income: TmnIncomeConfig): number {
  const { targetAmount: tmn, mmr, giving } = income
  return calculateFPForValue(tmn, mmr, giving)
}

/**
 * Calculate FP for a specific TMN value (used in projection)
 */
export function calculateFPForValue(tmn: number, mmr: number, giving: number): number {
  let fp = (0.9 * tmn - 1.02 * mmr - giving) / 1.02
  for (let i = 0; i < 10; i++) {
    const workersComp = fp * WORKERS_COMP_PCT
    const newFp = (0.9 * tmn - 1.02 * mmr - giving - workersComp) / 1.02
    if (Math.abs(newFp - fp) < 0.01) return Math.max(0, newFp)
    fp = newFp
  }
  return Math.max(0, fp)
}

export function calculateWorkersComp(fp: number): number {
  return fp * WORKERS_COMP_PCT
}

export function calculateIncomeBreakdown(fp: number) {
  const salaryPackage = fp / (1 + REQUIRED_SUPER_PCT)
  const requiredSuper = fp - salaryPackage
  const taxableIncome = salaryPackage * TAXABLE_TO_SALARY
  const mfb = salaryPackage * (1 - TAXABLE_TO_SALARY)
  return { salaryPackage, requiredSuper, taxableIncome, mfb }
}

/**
 * Calculate TMN breakdown for display on TMN settings page
 * Returns all intermediate values for the top-down formula view
 */
export function calculateTmnBreakdown(income: TmnIncomeConfig) {
  const { targetAmount: tmn, mmr, giving } = income
  
  // Step 1: Calculate levies
  const ptcLevy = tmn * PTC_LEVY_PCT
  
  // Step 2: Calculate FP (which auto-calculates workers comp internally)
  const fp = calculateFP(income)
  
  // Step 3: Calculate workers comp from FP
  const workersComp = calculateWorkersComp(fp)
  
  // Step 4: Strategy levy is based on FP + MMR
  const strategyLevy = (fp + mmr) * STRATEGY_LEVY_PCT
  
  // Step 5: Get income breakdown
  const breakdown = calculateIncomeBreakdown(fp)
  
  return {
    tmn,
    ptcLevy,
    strategyLevy,
    mmr,
    giving,
    workersComp,
    fp,
    requiredSuper: breakdown.requiredSuper,
    salaryPackage: breakdown.salaryPackage,
    taxableIncome: breakdown.taxableIncome,
    mfb: breakdown.mfb,
  }
}

/**
 * Calculate "Amount Paid to Bank Account" (net take-home pay)
 * This is: Taxable Income - Tax - Post-Tax Super - HECS
 */
export function calculateBankAmount(income: TmnIncomeConfig, hasHecsDebt: boolean = false): number {
  const fp = calculateFP(income)
  const breakdown = calculateIncomeBreakdown(fp)
  
  // Net pay = Taxable Income - Tax - Post-Tax Super
  const annualTaxable = breakdown.taxableIncome * 12
  const taxMonthly = calculateIncomeTax(annualTaxable) / 12
  
  // HECS basis is Taxable + MFB
  const annualRepaymentIncome = (breakdown.taxableIncome + breakdown.mfb) * 12
  const hecsMonthly = hasHecsDebt ? calculateHecsRepayment(annualRepaymentIncome) / 12 : 0
  
  const bankAmount = breakdown.taxableIncome - taxMonthly - income.postTaxSuper - hecsMonthly
  
  return Math.max(0, bankAmount)
}

/**
 * Calculate gross annual for bank assessment (excludes Centrelink)
 */
export function calculateSourceGrossAnnual(source: IncomeSource): number {
  if (source.type === 'tmn' && source.tmn) {
    const fp = calculateFP(source.tmn)
    const breakdown = calculateIncomeBreakdown(fp)
    // HECS basis is Taxable + MFB
    const annualRepaymentIncome = (breakdown.taxableIncome + breakdown.mfb) * 12
    return annualRepaymentIncome
  }
  if (source.type === 'salary' && source.salary) {
    return source.salary.grossAnnual
  }
  if (source.type === 'centrelink' && source.centrelink && source.centrelink.taxable) {
    return source.centrelink.fortnightlyAmount * 26
  }
  // Centrelink excluded from borrowing capacity usually, but for HECS it might count if taxable
  return 0
}

/**
 * Calculate the stepped TMN value for a given month in the projection journey
 */
export function getTmnValueAtMonth(
  currentAmount: number,
  targetAmount: number,
  increaseIntervalMonths: number,
  totalMonths: number,
  currentMonth: number
): number {
  if (increaseIntervalMonths <= 0) return currentAmount
  const numberOfSteps = Math.ceil(totalMonths / increaseIntervalMonths)
  if (numberOfSteps === 0) return currentAmount
  const tmnPerStep = (targetAmount - currentAmount) / numberOfSteps
  const currentStep = Math.min(numberOfSteps, Math.floor(currentMonth / increaseIntervalMonths))
  return currentAmount + (tmnPerStep * currentStep)
}

export function useTmnCalculator() {
  return {
    calculateFP,
    calculateFPForValue,
    calculateWorkersComp,
    calculateIncomeBreakdown,
    calculateTmnBreakdown,
    calculateBankAmount,
    calculateSourceGrossAnnual,
    getTmnValueAtMonth,
    STRATEGY_LEVY_PCT,
    PTC_LEVY_PCT,
    REQUIRED_SUPER_PCT,
    TAXABLE_TO_SALARY,
    WORKERS_COMP_PCT
  }
}

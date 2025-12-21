import type { 
  IncomeSource, 
  LoanConfig, 
  CostsConfig, 
  ScenarioResult,
  IncomeBreakdownItem,
  Person
} from '~/types'

import { 
  calculateIncomeTax, 
  calculateHecsRepayment,
  getIncomeYear
} from '~/composables/useTaxCalculator'

import { isIncomeActiveOnDate, getActiveIncomeSources } from '~/composables/useDateUtils'

import { 
  calculateFP,
  calculateFPForValue,
  calculateIncomeBreakdown
} from '~/composables/useTmnCalculator'

import { 
  solveAffordablePrice 
} from '~/composables/useStampDutyCalculator'

import {
  projectHecsBalance,
  calculatePersonRepaymentIncome,
  calculatePersonMonthlyHecsRepayment
} from '~/composables/useHecsCalculator'

const STRESS_RATE_BUFFER = 0.03

/**
 * Calculate net monthly income for a single source (for cash flow)
 * @param source - The income source
 * @param tmnOverride - Optional TMN value override (used for projections with stepped TMN growth)
 * @param date - Optional date for income year specific calculations (e.g. HECS)
 * @param people - Optional people list for HECS calculation
 */
export function calculateSourceNetMonthly(
  source: IncomeSource, 
  tmnOverride?: number, 
  date?: Date,
  people?: Person[]
): number {
  const incomeYear = date ? getIncomeYear(date) : undefined

  if (source.type === 'tmn' && source.tmn) {
    // Use override if provided, otherwise use targetAmount
    const tmn = tmnOverride ?? source.tmn.targetAmount
    const fp = calculateFPForValue(tmn, source.tmn.mmr, source.tmn.giving)
    const breakdown = calculateIncomeBreakdown(fp)
    
    // Tax is only on the taxable portion
    const annualTaxable = breakdown.taxableIncome * 12
    const taxMonthly = calculateIncomeTax(annualTaxable) / 12
    
    // HECS: Calculate based on person's total income for that year
    let hecsMonthly = 0
    if (people && date) {
      const person = people.find(p => p.id === source.personId)
      if (person?.hecsDebt) {
        const annualRepaymentIncome = calculatePersonRepaymentIncome(person.id, [source], incomeYear)
        hecsMonthly = calculateHecsRepayment(annualRepaymentIncome, incomeYear) / 12
      }
    }
    
    return breakdown.taxableIncome - taxMonthly - source.tmn.postTaxSuper + breakdown.mfb - hecsMonthly
  }
  if (source.type === 'salary' && source.salary) {
    const annual = source.salary.grossAnnual
    const tax = calculateIncomeTax(annual)
    let hecs = 0
    if (people && date) {
      const person = people.find(p => p.id === source.personId)
      if (person?.hecsDebt) {
        hecs = calculateHecsRepayment(annual, incomeYear)
      }
    }
    return (annual - tax - hecs) / 12
  }
  if (source.type === 'centrelink' && source.centrelink) {
    const fortnightly = source.centrelink.fortnightlyAmount
    const annual = fortnightly * 26
    let tax = 0
    if (source.centrelink.taxable) {
       tax = calculateIncomeTax(annual)
    }
    return (annual - tax) / 12
  }
  return 0
}

export function monthlyRepayment(principal: number, annualRate: number, years: number): number {
  const months = years * 12
  const monthlyRate = Math.max(0, annualRate / 12)
  if (months <= 0) return 0
  const factor = Math.pow(1 + monthlyRate, months)
  const payment = principal * ((monthlyRate * factor) / (factor - 1))
  return isFinite(payment) ? payment : 0
}

/**
 * Calculate Present Value (PV) of a loan given a monthly payment
 * Used for serviceability-based max loan calculation
 */
export function calculateMaxLoanFromPayment(payment: number, annualRate: number, years: number): number {
  const months = years * 12
  const monthlyRate = Math.max(0, annualRate / 12)
  if (months <= 0 || monthlyRate <= 0) return 0
  
  // PV = PMT * (1 - (1 + r)^-n) / r
  const factor = 1 - Math.pow(1 + monthlyRate, -months)
  const principal = payment * (factor / monthlyRate)
  
  return Math.max(0, principal)
}

/**
 * Calculate DTI Limit
 */
export function calculateDtiLimit(grossAnnual: number, dtiCap: number, existingDebt: number = 0): number {
  return (grossAnnual * dtiCap) - existingDebt
}

export function calculateCapacity(
  people: Person[],
  incomeSources: IncomeSource[],
  projectedDeposit: number,
  loan: LoanConfig,
  costs: CostsConfig,
  targetDateStr: string
): ScenarioResult {
  const targetDate = new Date(targetDateStr)
  const activeIncomes = getActiveIncomeSources(incomeSources, targetDate)

  // ========================================
  // STEP 1: HECS Projection (for DTI)
  // ========================================
  const peopleBreakdown = people.map(person => {
    let projectedHecs = 0
    let currentHecs = 0
    let repaymentsDuringJourney = 0
    let indexationDuringJourney = 0

    if (person.hecsDebt) {
      currentHecs = person.hecsDebt.balance
      const projection = projectHecsBalance(person.hecsDebt, targetDateStr, incomeSources, person.id)
      projectedHecs = projection.projectedBalance
      repaymentsDuringJourney = projection.totalRepayments
      indexationDuringJourney = projection.totalIndexation
    }

    return {
      name: person.name,
      personId: person.id,
      currentHecs,
      projectedHecs,
      repaymentsDuringJourney,
      indexationDuringJourney
    }
  })

  const totalProjectedHecs = peopleBreakdown.reduce((sum, p) => sum + p.projectedHecs, 0)

  // ========================================
  // STEP 2: Household Income for Serviceability
  // ========================================
  let totalHecsMonthly = 0
  let applicantNet = 0 
  let spouseNet = 0    
  let applicantHecs = 0
  let spouseHecs = 0
  let mfbAssessed = 0
  let mfbRaw = 0
  
  // Group by person for accurate HECS
  for (const person of people) {
    const personIncomes = activeIncomes.filter(s => s.personId === person.id)
    let personTaxableGross = 0
    let personMfb = 0
    let personNet = 0

    for (const source of personIncomes) {
      if (source.type === 'tmn' && source.tmn) {
        const fp = calculateFP(source.tmn)
        const breakdown = calculateIncomeBreakdown(fp)
        const annualTaxable = breakdown.taxableIncome * 12
        const taxMonthly = calculateIncomeTax(annualTaxable) / 12
        
        personTaxableGross += annualTaxable
        personMfb += breakdown.mfb
        personNet += (breakdown.taxableIncome - taxMonthly - source.tmn.postTaxSuper + breakdown.mfb)
        mfbRaw += breakdown.mfb
        mfbAssessed += breakdown.mfb
      } else if (source.type === 'salary' && source.salary) {
        const annual = source.salary.grossAnnual
        const tax = calculateIncomeTax(annual)
        personTaxableGross += annual
        personNet += (annual - tax) / 12
      } else if (source.type === 'centrelink' && source.centrelink) {
        const annual = source.centrelink.fortnightlyAmount * 26
        let tax = 0
        if (source.centrelink.taxable) {
          tax = calculateIncomeTax(annual)
          personTaxableGross += annual
        }
        personNet += (annual - tax) / 12
      }
    }

    // Apply Person-level HECS
    let personHecsMonthly = 0
    const personBreakdown = peopleBreakdown.find(p => p.personId === person.id)
    if (person.hecsDebt && personBreakdown) {
      const { repayment } = calculatePersonMonthlyHecsRepayment(
        person.id, 
        activeIncomes, 
        targetDate, 
        personBreakdown.projectedHecs
      )
      personHecsMonthly = repayment
      personNet -= personHecsMonthly
      totalHecsMonthly += personHecsMonthly
    }

    if (person.id === people[0]?.id) {
      applicantNet = personNet
      applicantHecs = personHecsMonthly
    } else {
      spouseNet += personNet
      spouseHecs += personHecsMonthly
    }
  }

  const totalNetMonthly = applicantNet + spouseNet
  const monthlySurplus = totalNetMonthly - loan.baseExpenses

  // ========================================
  // STEP 3: DTI Gate
  // ========================================
  const grossHouseholdAnnual = activeIncomes.reduce((sum, s) => {
      if (s.type === 'tmn' && s.tmn) {
          const fp = calculateFP(s.tmn)
          const breakdown = calculateIncomeBreakdown(fp)
          return sum + (breakdown.taxableIncome + breakdown.mfb) * 12
      }
      if (s.type === 'salary' && s.salary) {
          return sum + s.salary.grossAnnual
      }
      if (s.type === 'centrelink' && s.centrelink && s.centrelink.taxable) {
          return sum + (s.centrelink.fortnightlyAmount * 26)
      }
      return sum
  }, 0)
  
  const maxLoanDTI = calculateDtiLimit(grossHouseholdAnnual, loan.dtiCap, totalProjectedHecs)

  // ========================================
  // STEP 4: Serviceability Gate
  // ========================================
  const stressRate = loan.interestRate + STRESS_RATE_BUFFER
  const maxLoanServiceability = calculateMaxLoanFromPayment(monthlySurplus, stressRate, loan.loanTerm)

  // ========================================
  // STEP 5: Final Capacity & Purchase Price
  // ========================================
  let borrowingCapacity = Math.min(maxLoanDTI, maxLoanServiceability)
  borrowingCapacity = Math.max(0, borrowingCapacity)
  
  const limitingFactor = maxLoanServiceability < maxLoanDTI ? 'Serviceability' : 'DTI'
  const maxPurchasePrice = borrowingCapacity + projectedDeposit

  // ========================================
  // STEP 6: Costs & Affordable Price
  // ========================================
  const solved = solveAffordablePrice(maxPurchasePrice, costs, targetDateStr)

  // ========================================
  // STEP 7: Repayments
  // ========================================
  const actualRepayment = monthlyRepayment(borrowingCapacity, loan.interestRate, loan.loanTerm)
  const stressRepayment = monthlyRepayment(borrowingCapacity, stressRate, loan.loanTerm)
  const dtiRatio = grossHouseholdAnnual > 0 ? borrowingCapacity / grossHouseholdAnnual : 0

  return {
    borrowingCapacity: Math.round(borrowingCapacity),
    dtiCapacity: Math.round(maxLoanDTI),
    serviceabilityCapacity: Math.round(maxLoanServiceability),
    maxPurchasePrice: Math.round(maxPurchasePrice),
    monthlyRepayment: Math.round(actualRepayment),
    stressRepayment: Math.round(stressRepayment),
    stressRate: Math.round(stressRate * 1000) / 1000,
    limitingFactor,
    assessedIncome: Math.round(totalNetMonthly),
    dtiRatio: Math.round(dtiRatio * 10) / 10,
    hecsMonthlyImpact: Math.round(totalHecsMonthly),
    
    costs: {
      stampDuty: solved.stampDuty,
      concessionApplied: solved.concessionApplied,
      concessionAmount: solved.concessionAmount,
      totalCosts: solved.totalCosts,
      affordablePrice: solved.affordablePrice
    },
    
    grossAnnualIncome: Math.round(grossHouseholdAnnual),
    monthlySurplus: Math.round(monthlySurplus),

    breakdown: {
      applicantNet: Math.round(applicantNet),
      spouseNet: Math.round(spouseNet),
      mfbAssessed: Math.round(mfbAssessed),
      mfbRaw: Math.round(mfbRaw),
      applicantHecs: Math.round(applicantHecs),
      spouseHecs: Math.round(spouseHecs),
      taxMonthly: 0,
      grossTaxableAnnual: 0,
      grossMfbAnnual: Math.round(mfbAssessed * 12),
      spouseGrossAnnual: Math.round(spouseNet * 12),
      existingDebt: Math.round(totalProjectedHecs),
      people: peopleBreakdown.map(p => ({
        name: p.name,
        projectedHecs: p.projectedHecs,
        currentHecs: p.currentHecs,
        repaymentsDuringJourney: p.repaymentsDuringJourney,
        indexationDuringJourney: p.indexationDuringJourney
      }))
    }
  }
}

export function useLoanCalculator() {
  return {
    calculateCapacity,
    calculateSourceNetMonthly
  }
}

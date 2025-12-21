import { describe, it, expect } from 'vitest'
import { 
  monthlyRepayment, 
  calculateMaxLoanFromPayment, 
  calculateDtiLimit,
  calculateCapacity
} from '~/composables/useLoanCalculator'
import type { Person, IncomeSource, LoanConfig, CostsConfig } from '~/types'

describe('useLoanCalculator', () => {
  const people: Person[] = [
    { id: 'p1', name: 'Dan' },
    { id: 'p2', name: 'Sarah' }
  ]

  const incomes: IncomeSource[] = [
    {
      id: 'i1',
      personId: 'p1',
      name: 'Dan Job',
      type: 'salary',
      startDate: null,
      endDate: null,
      salary: { grossAnnual: 100000 }
    }
  ]

  const loan: LoanConfig = {
    deposit: 100000,
    interestRate: 0.06,
    baseExpenses: 3000,
    loanTerm: 30,
    dtiCap: 6
  }

  const costs: CostsConfig = {
    isFirstHomeBuyer: true,
    state: 'QLD',
    propertyType: 'existing',
    legalCosts: 2000,
    buildingAndPest: 1000,
    otherGovtCosts: 1500
  }

  describe('calculateCapacity', () => {
    it('calculates borrowing power with people and incomes', () => {
      const result = calculateCapacity(people, incomes, 100000, loan, costs, '2026-07-01')
      expect(result.borrowingCapacity).toBeGreaterThan(0)
      expect(result.breakdown.people).toHaveLength(2)
    })

    it('correctly identifies limiting factor', () => {
       // High income, low DTI cap = DTI limited
       const richIncomes: IncomeSource[] = [{
         id: 'i1', personId: 'p1', name: 'Rich', type: 'salary', startDate: null, endDate: null,
         salary: { grossAnnual: 2000000 }
       }]
       const result = calculateCapacity(people, richIncomes, 100000, { ...loan, dtiCap: 3 }, costs, '2026-07-01')
       expect(result.limitingFactor).toBe('DTI')
    })
  })

  describe('monthlyRepayment', () => {
    it('calculates amortization correctly', () => {
      // $500k loan, 6% rate, 30 years
      const payment = monthlyRepayment(500000, 0.06, 30)
      expect(payment).toBeCloseTo(2997.75, 0) // ~$2,998/month
    })
    
    it('returns 0 for zero principal', () => {
      expect(monthlyRepayment(0, 0.06, 30)).toBe(0)
    })
  })
  
  describe('calculateMaxLoanFromPayment', () => {
    it('inverts amortization correctly', () => {
      const maxLoan = calculateMaxLoanFromPayment(2997.75, 0.06, 30)
      expect(maxLoan).toBeCloseTo(500000, -1) // Within $10
    })
  })
  
  describe('calculateDtiLimit', () => {
    it('calculates max debt from income and cap', () => {
      // $100k gross × 6 DTI cap = $600k max
      const result = calculateDtiLimit(100000, 6)
      expect(result).toBe(600000)
    })
    
    it('subtracts existing debt', () => {
      const result = calculateDtiLimit(100000, 6, 50000)
      expect(result).toBe(550000)
    })
  })
})
